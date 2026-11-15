-- ===========================================================================
-- 015 — Integration key expiry and zero-downtime rotation
-- ===========================================================================
alter table integration_connections
  add column key_expires_at timestamptz not null default now() + interval '365 days',
  add column previous_key_hash text unique,
  add column previous_key_expires_at timestamptz,
  add column key_rotated_at timestamptz,
  add column expiry_notice_sent_at timestamptz;

insert into platform_settings(key, value, description) values
  ('integration.key_max_days', '365', 'Maximum lifetime of an integration API key before it must be rotated.'),
  ('integration.rotation_grace_hours', '24', 'How long the previous key keeps working after a rotation.')
on conflict (key) do nothing;

create or replace function app.create_integration(p_institution uuid, p_name text, p_system_type text, p_standard text,
                                                  p_key_prefix text, p_key_hash text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  if not app.has_capability(p_institution, 'integrations:manage') then
    perform app.fail('NP403', 'Only institution administrators can register integrations.');
  end if;
  if char_length(coalesce(trim(p_name), '')) < 3 then perform app.fail('NP400', 'Name the connected system.'); end if;
  insert into integration_connections(institution_id, name, system_type, standard, status, api_key_prefix, api_key_hash, created_by, key_expires_at)
  values (p_institution, trim(p_name), p_system_type, p_standard, 'pending', p_key_prefix, p_key_hash, app.uid(),
          now() + make_interval(days => app.setting_int('integration.key_max_days', 365)))
  returning id into v_id;
  perform app.audit('integration.created', 'integration_connection', v_id::text, null, p_institution,
                    jsonb_build_object('system_type', p_system_type, 'standard', p_standard));
  perform app.notify_platform_role('platform_admin', 'integration', 'Integration awaiting approval',
          'An institution registered a records-system connection that needs approval.', '/admin/institutions/' || p_institution, 'info');
  return v_id;
end $$;

-- Issue a new key; the current one keeps working for the grace period.
create or replace function app.rotate_integration_key(p_connection uuid, p_new_prefix text, p_new_hash text) returns timestamptz
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_c integration_connections%rowtype; v_grace timestamptz;
begin
  select * into v_c from integration_connections where id = p_connection for update;
  if not found then perform app.fail('NP404', 'Connection not found.'); end if;
  if not app.has_capability(v_c.institution_id, 'integrations:manage') then perform app.fail('NP403', 'Not permitted.'); end if;
  if v_c.status = 'revoked' then perform app.fail('NP409', 'A revoked connection cannot be rotated. Create a new one.'); end if;
  v_grace := least(now() + make_interval(hours => app.setting_int('integration.rotation_grace_hours', 24)), v_c.key_expires_at);
  update integration_connections set
    previous_key_hash = case when v_c.key_expires_at > now() then v_c.api_key_hash end,
    previous_key_expires_at = case when v_c.key_expires_at > now() then v_grace end,
    api_key_prefix = p_new_prefix, api_key_hash = p_new_hash, key_rotated_at = now(), expiry_notice_sent_at = null,
    key_expires_at = now() + make_interval(days => app.setting_int('integration.key_max_days', 365))
  where id = p_connection;
  perform app.audit('integration.key_rotated', 'integration_connection', p_connection::text, null, v_c.institution_id,
                    jsonb_build_object('previous_valid_until', v_grace));
  return v_grace;
end $$;

-- Revoking also kills any key still in its grace period.
create or replace function app.set_integration_status(p_connection uuid, p_status integration_status) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_c integration_connections%rowtype;
begin
  select * into v_c from integration_connections where id = p_connection for update;
  if not found then perform app.fail('NP404', 'Connection not found.'); end if;
  if p_status = 'active' and not app.has_platform_role('platform_admin') then
    perform app.fail('NP403', 'Only the platform team can activate a connection.');
  end if;
  if p_status <> 'active' and not (app.has_platform_role('platform_admin') or app.has_capability(v_c.institution_id, 'integrations:manage')) then
    perform app.fail('NP403', 'Not permitted.');
  end if;
  if v_c.status = 'revoked' then perform app.fail('NP409', 'A revoked connection cannot be reused. Create a new one.'); end if;
  update integration_connections set status = p_status,
         previous_key_hash = case when p_status = 'revoked' then null else previous_key_hash end,
         previous_key_expires_at = case when p_status = 'revoked' then null else previous_key_expires_at end
   where id = p_connection;
  perform app.audit('integration.status', 'integration_connection', p_connection::text, null, v_c.institution_id,
                    jsonb_build_object('from', v_c.status, 'to', p_status));
end $$;

-- Warn institutions 30 days before a key expires (called from the expiry job).
create or replace function app.integration_expiry_warnings() returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare r record; n integer := 0;
begin
  for r in update integration_connections set expiry_notice_sent_at = now()
           where status = 'active' and expiry_notice_sent_at is null and key_expires_at <= now() + interval '30 days'
           returning id, institution_id, name, key_expires_at loop
    n := n + 1;
    perform app.notify_institution(r.institution_id, 'integrations:manage', 'integration', 'Integration key expiring',
            format('The key for "%s" expires on %s. Rotate it to avoid interruption.', r.name, to_char(r.key_expires_at, 'DD Mon YYYY')),
            '/provider/integrations', 'warning');
  end loop;
  return n;
end $$;

create or replace function app.integration_ingest(p_key_hash text, p_health_id text, p_records jsonb)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_c integration_connections%rowtype;
  v_inst healthcare_institutions%rowtype;
  v_patient uuid;
  v_rec jsonb;
  v_id uuid;
  v_created integer := 0;
  v_skipped integer := 0;
  v_errors jsonb := '[]';
  v_att jsonb;
  v_keys jsonb := '[]';
begin
  select * into v_c from integration_connections
   where (api_key_hash = p_key_hash and key_expires_at > now())
      or (previous_key_hash = p_key_hash and previous_key_expires_at > now());
  if not found or v_c.status <> 'active' then perform app.fail('NP403', 'Unknown, expired or inactive integration key.'); end if;
  select * into v_inst from healthcare_institutions where id = v_c.institution_id;
  if v_inst.status <> 'approved' then perform app.fail('NP403', 'Institution is not approved.'); end if;

  select h.patient_id into v_patient from health_identifiers h join patients p on p.id = h.patient_id
   where h.identifier_type = 'platform_hid' and h.value = upper(p_health_id)
     and p.status = 'active' and p.verification_status = 'verified';
  if v_patient is null then
    insert into access_events(institution_id, action, outcome, denial_reason, purpose)
    values (v_c.institution_id, 'submit_record', 'denied', 'patient_not_matched', 'integration:' || v_c.id);
    perform app.fail('NP404', 'No verified patient matches that Health ID.');
  end if;

  update integration_connections set last_used_at = now() where id = v_c.id;

  for v_rec in select * from jsonb_array_elements(coalesce(p_records, '[]')) loop
    begin
      if (v_rec ->> 'category') not in (select key from medical_record_categories) then
        raise exception 'unknown category %', v_rec ->> 'category' using errcode = 'NP400';
      end if;
      if exists (select 1 from medical_records where institution_id = v_c.institution_id and source_system_ref = v_rec ->> 'source_ref') then
        v_skipped := v_skipped + 1;
        continue;
      end if;
      insert into medical_records(patient_id, category_key, title, description, clinical_date, source, verification_status, status,
                                  institution_id, integration_connection_id, source_system_ref, attending_professional,
                                  submitted_by_user_id, structured_data)
      values (v_patient, v_rec ->> 'category', left(v_rec ->> 'title', 200), nullif(v_rec ->> 'description', ''),
              nullif(v_rec ->> 'clinical_date', '')::date, 'integration', 'integration_verified', 'available',
              v_c.institution_id, v_c.id, v_rec ->> 'source_ref', nullif(v_rec ->> 'practitioner', ''),
              v_c.created_by, v_rec -> 'structured_data')
      returning id into v_id;
      for v_att in select * from jsonb_array_elements(coalesce(v_rec -> 'attachments', '[]')) loop
        insert into medical_record_attachments(record_id, storage_key, file_name, mime_type, size_bytes, sha256, scan_status, scan_detail, scanned_at, uploaded_by)
        values (v_id, v_att ->> 'storage_key', v_att ->> 'file_name', v_att ->> 'mime_type', (v_att ->> 'size_bytes')::integer,
                v_att ->> 'sha256', 'clean', v_att ->> 'scan_detail', now(), v_c.created_by);
        v_keys := v_keys || to_jsonb(v_att ->> 'storage_key');
      end loop;
      insert into record_versions(record_id, version, change_type, snapshot, changed_by)
      values (v_id, 1, 'created', app.record_snapshot(v_id), v_c.created_by);
      insert into access_events(institution_id, patient_id, record_id, category_key, action, outcome, purpose)
      values (v_c.institution_id, v_patient, v_id, v_rec ->> 'category', 'submit_record', 'allowed', 'integration:' || v_c.id);
      v_created := v_created + 1;
    exception when others then
      v_errors := v_errors || jsonb_build_object('source_ref', v_rec ->> 'source_ref', 'error', sqlerrm);
    end;
  end loop;

  insert into care_relationships(patient_id, institution_id, established_via)
  values (v_patient, v_c.institution_id, 'integration') on conflict do nothing;

  insert into audit_logs(actor_type, action, entity_type, entity_id, patient_id, institution_id, metadata, hash)
  values ('integration', 'integration.ingested', 'integration_connection', v_c.id::text, v_patient, v_c.institution_id,
          jsonb_build_object('created', v_created, 'skipped', v_skipped, 'errors', jsonb_array_length(v_errors)), 'pending');

  if v_created > 0 then
    perform app.notify_patient(v_patient, 'new_record', 'New records added to your health history',
            format('%s sent %s new record(s) from its records system.', v_inst.name, v_created), '/records', 'info');
  end if;
  return jsonb_build_object('created', v_created, 'skipped_duplicates', v_skipped, 'errors', v_errors, 'stored_keys', v_keys);
end $$;

grant execute on function app.rotate_integration_key(uuid, text, text) to authenticated;
