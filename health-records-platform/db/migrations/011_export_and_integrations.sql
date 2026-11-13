-- ===========================================================================
-- 011 — Patient data export and hospital-system integrations
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Patient export (FR-075..078). Returns the patient's own records (all, or a
-- chosen subset) and logs an export_event. Only the patient or an active
-- representative may call it; step-up is enforced in the server layer.
-- ---------------------------------------------------------------------------
create or replace function app.patient_export(p_patient uuid, p_record_ids uuid[] default null, p_format text default 'structured_bundle')
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v jsonb;
  v_ids uuid[];
begin
  if not app.can_act_for_patient(p_patient) then perform app.fail('NP403', 'Not permitted.'); end if;
  if p_format not in ('structured_bundle', 'record_summary_pdf') then perform app.fail('NP400', 'Unknown export format.'); end if;

  select coalesce(array_agg(r.id), '{}') into v_ids from medical_records r
   where r.patient_id = p_patient and r.status in ('available','under_review','superseded')
     and (p_record_ids is null or r.id = any(p_record_ids));

  select jsonb_build_object(
    'generated_at', now(),
    'patient', (select jsonb_build_object('id', pt.id, 'full_name', pp.full_name, 'date_of_birth', pp.date_of_birth, 'sex', pp.sex,
                       'health_id', h.value, 'verification_status', pt.verification_status)
                from patients pt join patient_profiles pp on pp.patient_id = pt.id
                left join health_identifiers h on h.patient_id = pt.id and h.identifier_type = 'platform_hid'
                where pt.id = p_patient),
    'records', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'category', r.category_key, 'title', r.title, 'description', r.description,
        'clinical_date', r.clinical_date, 'added_at', r.created_at, 'source', r.source,
        'verification_status', r.verification_status, 'status', r.status,
        'institution', i.name, 'professional', r.attending_professional, 'facility', r.originating_facility,
        'structured_data', r.structured_data, 'version', r.current_version,
        'attachments', (select coalesce(jsonb_agg(jsonb_build_object('file_name', a.file_name, 'mime_type', a.mime_type, 'sha256', a.sha256)), '[]')
                        from medical_record_attachments a where a.record_id = r.id and a.scan_status = 'clean'))
        order by coalesce(r.clinical_date, r.created_at::date) desc)
      from medical_records r left join healthcare_institutions i on i.id = r.institution_id
      where r.id = any(v_ids)), '[]'))
  into v;

  insert into export_events(patient_id, actor_user_id, export_type, record_ids, destination)
  values (p_patient, app.uid(), p_format, v_ids, 'self_download');
  perform app.audit('record.exported', 'patient', p_patient::text, p_patient, null,
                    jsonb_build_object('format', p_format, 'records', cardinality(v_ids)));
  perform app.notify_patient(p_patient, 'record_export', 'Your records were exported',
          format('A copy of %s record(s) was downloaded from your account. If this wasn''t you, change your password and report it.', cardinality(v_ids)),
          '/activity', 'warning', true);
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- Integrations. An institution with integrations:manage registers a
-- connection; platform admins activate it. API keys are shown once and stored
-- only as SHA-256 hashes.
-- ---------------------------------------------------------------------------
create or replace function app.create_integration(p_institution uuid, p_name text, p_system_type text, p_standard text,
                                                  p_key_prefix text, p_key_hash text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  if not app.has_capability(p_institution, 'integrations:manage') then
    perform app.fail('NP403', 'Only institution administrators can register integrations.');
  end if;
  if char_length(coalesce(trim(p_name), '')) < 3 then perform app.fail('NP400', 'Name the connected system.'); end if;
  insert into integration_connections(institution_id, name, system_type, standard, status, api_key_prefix, api_key_hash, created_by)
  values (p_institution, trim(p_name), p_system_type, p_standard, 'pending', p_key_prefix, p_key_hash, app.uid())
  returning id into v_id;
  perform app.audit('integration.created', 'integration_connection', v_id::text, null, p_institution,
                    jsonb_build_object('system_type', p_system_type, 'standard', p_standard));
  perform app.notify_platform_role('platform_admin', 'integration', 'Integration awaiting approval',
          'An institution registered a records-system connection that needs approval.', '/admin/institutions/' || p_institution, 'info');
  return v_id;
end $$;

create or replace function app.set_integration_status(p_connection uuid, p_status integration_status) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_c integration_connections%rowtype;
begin
  select * into v_c from integration_connections where id = p_connection for update;
  if not found then perform app.fail('NP404', 'Connection not found.'); end if;
  -- Activation is a platform decision; institutions may pause or revoke their own.
  if p_status = 'active' and not app.has_platform_role('platform_admin') then
    perform app.fail('NP403', 'Only the platform team can activate a connection.');
  end if;
  if p_status <> 'active' and not (app.has_platform_role('platform_admin') or app.has_capability(v_c.institution_id, 'integrations:manage')) then
    perform app.fail('NP403', 'Not permitted.');
  end if;
  if v_c.status = 'revoked' then perform app.fail('NP409', 'A revoked connection cannot be reused. Create a new one.'); end if;
  update integration_connections set status = p_status where id = p_connection;
  perform app.audit('integration.status', 'integration_connection', p_connection::text, null, v_c.institution_id,
                    jsonb_build_object('from', v_c.status, 'to', p_status));
end $$;

-- Ingest normalised records from an authenticated connection. Idempotent per
-- (institution, source_system_ref): re-sending the same resource is a no-op.
-- Called by the server after it has hashed the bearer key; the key hash is
-- the credential, re-checked here.
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
begin
  select * into v_c from integration_connections where api_key_hash = p_key_hash;
  if not found or v_c.status <> 'active' then perform app.fail('NP403', 'Unknown or inactive integration key.'); end if;
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
  return jsonb_build_object('created', v_created, 'skipped_duplicates', v_skipped, 'errors', v_errors);
end $$;

grant select on integration_connections to authenticated;
grant execute on function app.patient_export(uuid, uuid[], text), app.create_integration(uuid, text, text, text, text, text),
  app.set_integration_status(uuid, integration_status) to authenticated;
-- integration_ingest is NOT granted to authenticated: only the server (service_role) calls it, after key hashing.
