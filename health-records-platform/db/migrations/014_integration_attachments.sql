-- Integration ingestion now stores validated, scanned document attachments (FHIR DocumentReference / presentedForm).
-- Returns stored_keys so the server can discard files for records that were skipped as duplicates or failed.
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
