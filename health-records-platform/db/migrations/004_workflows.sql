-- ===========================================================================
-- 004 — Workflow functions
--
-- Conventions
--   • Errors use custom SQLSTATEs the server maps to HTTP responses:
--       NP400 invalid input   NP403 forbidden   NP404 not found   NP409 conflict
--   • Reads of protected data never RAISE on denial: they log a denied
--     access_event and return {allowed:false}, so the denial is committed.
--   • Every function derives the actor from app.uid(); ids passed in are
--     targets, never identities.
-- ===========================================================================

alter table permissions add column expiry_notice_sent_at timestamptz;

create or replace function app.fail(p_code text, p_message text) returns void
language plpgsql as $$
begin
  raise exception '%', p_message using errcode = p_code;
end $$;

create or replace function app.latest_consent_version(p_key text) returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select id from consent_versions where key = p_key and retired_at is null and effective_from <= now()
  order by version desc limit 1
$$;

create or replace function app.record_snapshot(p_record_id uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'title', title, 'category', category_key, 'description', description, 'clinical_date', clinical_date,
    'status', status, 'verification_status', verification_status, 'structured_data', structured_data,
    'institution_id', institution_id, 'professional_id', professional_id,
    'attachments', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'sha256', a.sha256, 'file_name', a.file_name)), '[]')
                    from medical_record_attachments a where a.record_id = r.id))
  from medical_records r where r.id = p_record_id
$$;

-- ===========================================================================
-- PATIENT: uploads
-- ===========================================================================
-- Called after the file has been validated, scanned and written to private
-- storage. Creates the record, the attachment and version 1 atomically.
create or replace function app.patient_create_upload(
  p_patient uuid, p_category text, p_title text, p_clinical_date date, p_facility text,
  p_description text, p_storage_key text, p_file_name text, p_mime text, p_size integer,
  p_sha256 text, p_scan_status scan_status, p_scan_detail text)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_record uuid;
  v_dupe uuid;
begin
  if not app.can_act_for_patient(p_patient) then
    perform app.fail('NP403', 'You can only upload records to your own health record.');
  end if;
  if p_scan_status <> 'clean' then
    perform app.fail('NP400', 'The file did not pass the security check and was not saved.');
  end if;
  if p_category not in (select key from medical_record_categories) then
    perform app.fail('NP400', 'Choose a valid record category.');
  end if;

  -- Same bytes already on this patient's record? Flag, don't block.
  select r.id into v_dupe from medical_record_attachments a join medical_records r on r.id = a.record_id
    where r.patient_id = p_patient and a.sha256 = p_sha256 limit 1;

  insert into medical_records(patient_id, category_key, title, description, clinical_date, source,
                              verification_status, status, originating_facility, submitted_by_user_id, duplicate_of)
  values (p_patient, p_category, p_title, nullif(trim(p_description), ''), p_clinical_date, 'patient_upload',
          'patient_provided', 'available', nullif(trim(p_facility), ''), app.uid(), v_dupe)
  returning id into v_record;

  insert into medical_record_attachments(record_id, storage_key, file_name, mime_type, size_bytes, sha256,
                                         scan_status, scan_detail, scanned_at, uploaded_by)
  values (v_record, p_storage_key, p_file_name, p_mime, p_size, p_sha256, p_scan_status, p_scan_detail, now(), app.uid());

  insert into record_versions(record_id, version, change_type, snapshot, changed_by)
  values (v_record, 1, 'created', app.record_snapshot(v_record), app.uid());

  perform app.audit('record.uploaded_by_patient', 'medical_record', v_record::text, p_patient, null,
                    jsonb_build_object('category', p_category, 'possible_duplicate', v_dupe is not null));
  return v_record;
end $$;

-- ===========================================================================
-- PATIENT: access decisions
-- ===========================================================================
create or replace function app.decide_access_request(
  p_request uuid,
  p_decision text,                       -- 'approve' | 'partial' | 'reject'
  p_categories text[] default null,      -- partial: subset of requested
  p_record_ids uuid[] default null,      -- partial: optional specific records
  p_date_from date default null,
  p_date_to date default null,
  p_duration_days integer default null,  -- partial: <= requested
  p_restrict_to_requester boolean default false,
  p_note text default null)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_req access_requests%rowtype;
  v_inst healthcare_institutions%rowtype;
  v_requested text[];
  v_cats text[];
  v_from date;
  v_to date;
  v_days integer;
  v_perm uuid;
  v_basis authorization_basis;
  v_consent uuid;
  v_pro_user uuid;
  v_status request_status;
  v_cat text;
  v_rec uuid;
begin
  select * into v_req from access_requests where id = p_request for update;
  if not found then perform app.fail('NP404', 'Access request not found.'); end if;
  if not app.can_act_for_patient(v_req.patient_id) then
    perform app.fail('NP403', 'Only the patient or their verified representative can respond to this request.');
  end if;
  if v_req.status <> 'pending' then
    perform app.fail('NP409', 'This request has already been answered or has closed.');
  end if;
  if v_req.respond_by <= now() then
    update access_requests set status = 'expired' where id = p_request;
    perform app.fail('NP409', 'This request expired before it was answered. The institution must send a new request.');
  end if;

  select user_id into v_pro_user from healthcare_professionals where id = v_req.requested_by_professional_id;

  if p_decision = 'reject' then
    update access_requests set status = 'rejected', decided_at = now(), decided_by_user_id = app.uid(),
           decision_note = nullif(trim(p_note), '') where id = p_request;
    perform app.audit('access_request.rejected', 'access_request', p_request::text, v_req.patient_id, v_req.institution_id, '{}');
    perform app.notify(v_pro_user, 'access_request_decision', 'Access request declined',
            format('Request %s was declined by the patient. No records were shared.', v_req.reference),
            '/provider/requests', 'warning');
    perform app.notify_patient(v_req.patient_id, 'access_request_decision', 'You declined an access request',
            format('Request %s was declined. The institution has not been given access.', v_req.reference),
            '/access?tab=pending', 'info');
    return null;
  end if;

  if p_decision not in ('approve', 'partial') then
    perform app.fail('NP400', 'Unknown decision.');
  end if;

  select * into v_inst from healthcare_institutions where id = v_req.institution_id;
  if v_inst.status <> 'approved' then
    perform app.fail('NP409', 'This institution is not currently verified on the platform, so access cannot be granted.');
  end if;
  if not exists (select 1 from professional_affiliations a
                     where a.professional_id = v_req.requested_by_professional_id
                       and a.institution_id = v_req.institution_id and a.status = 'active') then
    perform app.fail('NP409', 'The professional who made this request is no longer active at the institution.');
  end if;

  select array_agg(category_key order by category_key) into v_requested
    from access_request_categories where request_id = p_request;

  if p_decision = 'approve' then
    v_cats := v_requested; v_from := v_req.date_from; v_to := v_req.date_to; v_days := v_req.requested_duration_days;
    v_status := 'approved';
  else
    v_cats := (select array_agg(distinct c order by c) from unnest(coalesce(p_categories, '{}')) c);
    if v_cats is null or cardinality(v_cats) = 0 then
      perform app.fail('NP400', 'Choose at least one category to share, or decline the request.');
    end if;
    if not (v_cats <@ v_requested) then
      perform app.fail('NP400', 'You can only share categories the institution asked for.');
    end if;
    v_from := coalesce(p_date_from, v_req.date_from);
    v_to := coalesce(p_date_to, v_req.date_to);
    if v_req.date_from is not null and v_from < v_req.date_from then v_from := v_req.date_from; end if;
    if v_req.date_to is not null and v_to > v_req.date_to then v_to := v_req.date_to; end if;
    if v_from is not null and v_to is not null and v_from > v_to then
      perform app.fail('NP400', 'The start date must be before the end date.');
    end if;
    v_days := least(coalesce(p_duration_days, v_req.requested_duration_days), v_req.requested_duration_days);
    if v_days < 1 then perform app.fail('NP400', 'Access must last at least one day.'); end if;
    v_status := case when v_cats = v_requested and p_record_ids is null and v_from is not distinct from v_req.date_from
                       and v_to is not distinct from v_req.date_to and v_days = v_req.requested_duration_days
                       and not p_restrict_to_requester
                     then 'approved' else 'partially_approved' end;
  end if;

  -- Specific records must belong to this patient and sit inside the chosen categories.
  if p_record_ids is not null and cardinality(p_record_ids) > 0 then
    if exists (select 1 from unnest(p_record_ids) rid
               left join medical_records r on r.id = rid
               where r.id is null or r.patient_id <> v_req.patient_id or not (r.category_key = any(v_cats))) then
      perform app.fail('NP400', 'One of the selected records is not part of this request.');
    end if;
  end if;

  v_basis := case when exists (select 1 from patients where id = v_req.patient_id and user_id = app.uid())
                  then 'patient_consent' else 'representative_consent' end;
  v_consent := app.latest_consent_version('access_grant');
  if v_consent is null then perform app.fail('NP409', 'No active consent terms are configured.'); end if;

  insert into permissions(reference, patient_id, institution_id, access_request_id, professional_id, purpose, purpose_detail,
                          authorization_basis, consent_version_id, date_from, date_to, granted_by_user_id,
                          valid_from, expires_at)
  values (app.short_ref('PRM'), v_req.patient_id, v_req.institution_id, p_request,
          case when p_restrict_to_requester then v_req.requested_by_professional_id end,
          v_req.purpose, v_req.purpose_detail, v_basis, v_consent, v_from, v_to, app.uid(),
          now(), now() + make_interval(days => v_days))
  returning id into v_perm;

  foreach v_cat in array v_cats loop
    if p_record_ids is not null and exists (select 1 from medical_records where id = any(p_record_ids) and category_key = v_cat) then
      for v_rec in select id from medical_records where id = any(p_record_ids) and category_key = v_cat loop
        insert into permission_scopes(permission_id, category_key, record_id) values (v_perm, v_cat, v_rec);
      end loop;
    else
      insert into permission_scopes(permission_id, category_key) values (v_perm, v_cat);
    end if;
  end loop;

  update access_requests set status = v_status, decided_at = now(), decided_by_user_id = app.uid(),
         decision_note = nullif(trim(p_note), '') where id = p_request;

  insert into care_relationships(patient_id, institution_id, established_via)
  values (v_req.patient_id, v_req.institution_id, 'access_permission')
  on conflict (patient_id, institution_id) do nothing;

  perform app.audit('permission.granted', 'permission', v_perm::text, v_req.patient_id, v_req.institution_id,
          jsonb_build_object('request', p_request, 'decision', v_status, 'categories', v_cats,
                             'specific_records', coalesce(cardinality(p_record_ids), 0), 'days', v_days,
                             'basis', v_basis, 'consent_version', v_consent, 'restricted_to_requester', p_restrict_to_requester));
  perform app.notify(v_pro_user, 'access_request_decision',
          case when v_status = 'approved' then 'Access request approved' else 'Access request partially approved' end,
          format('Request %s was %s. Access is limited to the approved scope and expires in %s days.',
                 v_req.reference, replace(v_status::text, '_', ' '), v_days),
          '/provider/patients', 'success');
  perform app.notify_patient(v_req.patient_id, 'access_granted', 'You granted access to your records',
          format('%s can see the records you approved for %s days. You can revoke this at any time.', v_inst.name, v_days),
          '/access?tab=active', 'success');
  return v_perm;
end $$;

create or replace function app.revoke_permission(p_permission uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_perm permissions%rowtype;
  v_inst_name text;
begin
  select * into v_perm from permissions where id = p_permission for update;
  if not found then perform app.fail('NP404', 'Permission not found.'); end if;
  if not app.can_act_for_patient(v_perm.patient_id) then
    perform app.fail('NP403', 'Only the patient or their verified representative can revoke this permission.');
  end if;
  if v_perm.authorization_basis not in ('patient_consent', 'representative_consent') then
    perform app.fail('NP409', 'This access was not granted by you, so it cannot be revoked here. Report it if you believe it is inappropriate.');
  end if;
  if v_perm.status <> 'active' or v_perm.expires_at <= now() then
    perform app.fail('NP409', 'This permission is no longer active.');
  end if;

  update permissions set status = 'revoked', revoked_at = now(), revoked_by_user_id = app.uid(),
         revocation_reason = coalesce(nullif(trim(p_reason), ''), 'Revoked by patient')
   where id = p_permission;

  select name into v_inst_name from healthcare_institutions where id = v_perm.institution_id;
  perform app.audit('permission.revoked', 'permission', p_permission::text, v_perm.patient_id, v_perm.institution_id,
                    jsonb_build_object('reference', v_perm.reference));
  perform app.notify_institution(v_perm.institution_id, 'records:view_authorized', 'permission_revoked',
          'Patient access revoked', format('Permission %s has been revoked by the patient. Access ended immediately.', v_perm.reference),
          '/provider/patients', 'warning');
  perform app.notify_patient(v_perm.patient_id, 'permission_revoked', 'Access revoked',
          format('%s can no longer view your records through the platform.', v_inst_name), '/access?tab=revoked', 'success');
end $$;

-- ===========================================================================
-- PROVIDER: patient search (identity confirmation only — never clinical data)
-- ===========================================================================
create or replace function app.search_patients(
  p_institution uuid, p_health_id text default null, p_phone text default null,
  p_dob date default null, p_nin_hash text default null)
returns table (patient_id uuid, masked_name text, birth_year integer, sex sex_at_birth,
               health_id_hint text, has_active_permission boolean, has_pending_request boolean)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_reason text;
  v_patient uuid;
  v_recent integer;
begin
  v_reason := app.provider_denial_reason(p_institution, 'access:request');
  if v_reason is not null then
    perform app.log_access('search_patient', 'denied', p_institution, null, null, null, null, v_reason);
    return;
  end if;

  select count(*) into v_recent from access_events
    where actor_user_id = app.uid() and action = 'search_patient' and occurred_at > now() - interval '10 minutes';
  if v_recent >= app.setting_int('security.searches_per_10_minutes', 30) then
    perform app.log_access('search_patient', 'denied', p_institution, null, null, null, null, 'rate_limited');
    return;
  end if;

  if p_health_id is not null then
    if not app.is_valid_health_id(upper(replace(replace(p_health_id, ' ', ''), '-', ''))) then
      perform app.log_access('search_patient', 'allowed', p_institution, null);
      return;
    end if;
    select h.patient_id into v_patient from health_identifiers h
      where h.identifier_type = 'platform_hid' and h.value = upper(replace(replace(p_health_id, ' ', ''), '-', ''));
  elsif p_nin_hash is not null and p_dob is not null then
    select h.patient_id into v_patient from health_identifiers h
      join patient_profiles pp on pp.patient_id = h.patient_id
      where h.identifier_type = 'nin' and h.value_hash = p_nin_hash and pp.date_of_birth = p_dob;
  elsif p_phone is not null and p_dob is not null then
    select pp.patient_id into v_patient from patient_profiles pp
      join patients pt on pt.id = pp.patient_id left join users u on u.id = pt.user_id
      where coalesce(pp.phone, u.phone) = p_phone and pp.date_of_birth = p_dob
      limit 1;
  else
    perform app.fail('NP400', 'Search by Health ID, or by phone number or NIN together with date of birth.');
  end if;

  -- Only verified, active patients can be matched (BR-018 reliable identity).
  if v_patient is not null and not exists (
      select 1 from patients where id = v_patient and verification_status = 'verified' and status = 'active') then
    v_patient := null;
  end if;

  perform app.log_access('search_patient', 'allowed', p_institution, v_patient);
  if v_patient is null then return; end if;

  return query
    select pt.id, app.mask_name(pp.full_name), extract(year from pp.date_of_birth)::integer, pp.sex,
           '••••' || right(h.value, 4),
           cardinality(app.active_permission_ids(p_institution, pt.id)) > 0,
           exists (select 1 from access_requests ar where ar.patient_id = pt.id and ar.institution_id = p_institution
                   and ar.status = 'pending' and ar.respond_by > now())
    from patients pt
    join patient_profiles pp on pp.patient_id = pt.id
    left join health_identifiers h on h.patient_id = pt.id and h.identifier_type = 'platform_hid'
    where pt.id = v_patient;
end $$;

-- ===========================================================================
-- PROVIDER: access requests
-- ===========================================================================
create or replace function app.create_access_request(
  p_institution uuid, p_patient uuid, p_purpose access_purpose, p_purpose_detail text,
  p_categories text[], p_date_from date, p_date_to date, p_duration_days integer)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_reason text;
  v_id uuid;
  v_ref text;
  v_inst_name text;
  v_max_days integer := app.setting_int('access.max_permission_days', 180);
  v_cat text;
begin
  v_reason := app.provider_denial_reason(p_institution, 'access:request');
  if v_reason is not null then
    perform app.fail('NP403', 'You are not authorised to request access for this institution (' || v_reason || ').');
  end if;
  if not exists (select 1 from patients where id = p_patient and verification_status = 'verified' and status = 'active') then
    perform app.fail('NP404', 'Patient not found.');
  end if;
  if p_purpose = 'emergency_care' then
    perform app.fail('NP400', 'Emergency access uses the separate emergency workflow.');
  end if;
  if p_categories is null or cardinality(p_categories) = 0 then
    perform app.fail('NP400', 'Select at least one record category.');
  end if;
  if exists (select 1 from unnest(p_categories) c where c not in (select key from medical_record_categories)) then
    perform app.fail('NP400', 'Unknown record category.');
  end if;
  if p_duration_days < 1 or p_duration_days > v_max_days then
    perform app.fail('NP400', format('Access can be requested for between 1 and %s days.', v_max_days));
  end if;
  if char_length(coalesce(trim(p_purpose_detail), '')) < 10 then
    perform app.fail('NP400', 'Explain the clinical purpose in at least 10 characters.');
  end if;
  if exists (select 1 from access_requests where patient_id = p_patient and institution_id = p_institution
             and status = 'pending' and respond_by > now()) then
    perform app.fail('NP409', 'Your institution already has a pending request for this patient. Wait for the patient to respond.');
  end if;

  v_ref := app.short_ref('REQ');
  insert into access_requests(reference, patient_id, institution_id, requested_by_professional_id, requested_by_user_id,
                              purpose, purpose_detail, date_from, date_to, requested_duration_days, respond_by)
  values (v_ref, p_patient, p_institution, app.current_professional_id(), app.uid(), p_purpose, trim(p_purpose_detail),
          p_date_from, p_date_to, p_duration_days, now() + make_interval(days => app.setting_int('access.request_expiry_days', 7)))
  returning id into v_id;

  foreach v_cat in array (select array_agg(distinct c) from unnest(p_categories) c) loop
    insert into access_request_categories(request_id, category_key) values (v_id, v_cat);
  end loop;

  select name into v_inst_name from healthcare_institutions where id = p_institution;
  perform app.audit('access_request.created', 'access_request', v_id::text, p_patient, p_institution,
                    jsonb_build_object('reference', v_ref, 'purpose', p_purpose, 'categories', p_categories, 'days', p_duration_days));
  perform app.notify_patient(p_patient, 'access_request', 'New request to view your records',
          format('%s has asked to view some of your health records. Nothing is shared unless you approve.', v_inst_name),
          '/access?tab=pending', 'warning');
  return v_id;
end $$;

create or replace function app.cancel_access_request(p_request uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_req access_requests%rowtype;
begin
  select * into v_req from access_requests where id = p_request for update;
  if not found then perform app.fail('NP404', 'Request not found.'); end if;
  if not (v_req.requested_by_user_id = app.uid() and app.has_capability(v_req.institution_id, 'access:request'))
     and not app.has_capability(v_req.institution_id, 'staff:manage') then
    perform app.fail('NP403', 'You cannot cancel this request.');
  end if;
  if v_req.status <> 'pending' then perform app.fail('NP409', 'Only pending requests can be cancelled.'); end if;
  update access_requests set status = 'cancelled', decided_at = now() where id = p_request;
  perform app.audit('access_request.cancelled', 'access_request', p_request::text, v_req.patient_id, v_req.institution_id, '{}');
  perform app.notify_patient(v_req.patient_id, 'access_request', 'An access request was withdrawn',
          format('Request %s was withdrawn by the institution.', v_req.reference), '/access?tab=pending', 'info');
end $$;

-- ===========================================================================
-- PROVIDER: authorised reads (every call logged, allowed or denied)
-- ===========================================================================
create or replace function app.provider_patient_overview(p_institution uuid, p_patient uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_reason text;
  v_perms uuid[];
  v_result jsonb;
begin
  v_reason := app.provider_denial_reason(p_institution, 'records:view_authorized');
  if v_reason is null then
    v_perms := app.active_permission_ids(p_institution, p_patient);
    if cardinality(v_perms) = 0 then v_reason := 'no_active_permission'; end if;
  end if;
  if v_reason is not null then
    perform app.log_access('view_patient_summary', 'denied', p_institution, p_patient, null, null, null, v_reason);
    return jsonb_build_object('allowed', false, 'reason', v_reason);
  end if;

  select jsonb_build_object(
    'allowed', true,
    'patient', jsonb_build_object(
       'id', pt.id, 'full_name', pp.full_name, 'date_of_birth', pp.date_of_birth, 'sex', pp.sex,
       'health_id', h.value, 'status', pt.status),
    'permissions', (
       select jsonb_agg(jsonb_build_object(
         'id', p.id, 'reference', p.reference, 'purpose', p.purpose, 'purpose_detail', p.purpose_detail,
         'basis', p.authorization_basis, 'expires_at', p.expires_at, 'granted_at', p.granted_at,
         'date_from', p.date_from, 'date_to', p.date_to, 'restricted_to_professional', p.professional_id is not null,
         'categories', (select jsonb_agg(distinct s.category_key) from permission_scopes s where s.permission_id = p.id),
         'specific_records', (select count(*) from permission_scopes s where s.permission_id = p.id and s.record_id is not null))
         order by p.expires_at)
       from permissions p where p.id = any(v_perms)))
  into v_result
  from patients pt
  join patient_profiles pp on pp.patient_id = pt.id
  left join health_identifiers h on h.patient_id = pt.id and h.identifier_type = 'platform_hid'
  where pt.id = p_patient;

  perform app.log_access('view_patient_summary', 'allowed', p_institution, p_patient, null, null, v_perms[1]);
  return v_result;
end $$;

create or replace function app.provider_list_records(p_institution uuid, p_patient uuid)
returns table (id uuid, category_key text, title text, description text, clinical_date date, created_at timestamptz,
               source record_source, verification_status record_verification, status record_status,
               institution_name text, attending_professional text, originating_facility text,
               attachment_count bigint, permission_id uuid)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_reason text;
  v_count integer;
begin
  v_reason := app.provider_denial_reason(p_institution, 'records:view_authorized');
  if v_reason is null and cardinality(app.active_permission_ids(p_institution, p_patient)) = 0 then
    v_reason := 'no_active_permission';
  end if;
  if v_reason is not null then
    perform app.log_access('view_record_list', 'denied', p_institution, p_patient, null, null, null, v_reason);
    return;
  end if;

  return query
    select r.id, r.category_key, r.title, r.description, r.clinical_date, r.created_at, r.source,
           r.verification_status, r.status, i.name, r.attending_professional, r.originating_facility,
           (select count(*) from medical_record_attachments a where a.record_id = r.id and a.scan_status = 'clean'),
           app.authorizing_permission(p_institution, r.id)
    from medical_records r
    left join healthcare_institutions i on i.id = r.institution_id
    where r.patient_id = p_patient and app.authorizing_permission(p_institution, r.id) is not null
    order by coalesce(r.clinical_date, r.created_at::date) desc;

  get diagnostics v_count = row_count;
  perform app.log_access('view_record_list', 'allowed', p_institution, p_patient, null, null,
                         (app.active_permission_ids(p_institution, p_patient))[1], null, format('%s records', v_count));
end $$;

create or replace function app.provider_get_record(p_institution uuid, p_record uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_perm uuid;
  v_reason text;
  v_patient uuid;
  v_cat text;
  v_result jsonb;
begin
  select patient_id, category_key into v_patient, v_cat from medical_records where id = p_record;
  v_reason := app.provider_denial_reason(p_institution, 'records:view_authorized');
  if v_reason is null then
    v_perm := app.authorizing_permission(p_institution, p_record);
    if v_perm is null then v_reason := 'outside_permission_scope'; end if;
  end if;
  if v_reason is not null or v_patient is null then
    perform app.log_access('view_record', 'denied', p_institution, v_patient, case when v_patient is null then null else p_record end,
                           v_cat, null, coalesce(v_reason, 'record_not_found'));
    return jsonb_build_object('allowed', false, 'reason', coalesce(v_reason, 'record_not_found'));
  end if;

  select jsonb_build_object(
    'allowed', true, 'permission_id', v_perm,
    'record', jsonb_build_object(
      'id', r.id, 'patient_id', r.patient_id, 'category_key', r.category_key, 'title', r.title,
      'description', r.description, 'clinical_date', r.clinical_date, 'created_at', r.created_at,
      'source', r.source, 'verification_status', r.verification_status, 'status', r.status,
      'institution_name', i.name, 'attending_professional', r.attending_professional,
      'originating_facility', r.originating_facility, 'structured_data', r.structured_data,
      'current_version', r.current_version,
      'attachments', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'file_name', a.file_name,
                       'mime_type', a.mime_type, 'size_bytes', a.size_bytes) order by a.created_at), '[]')
                      from medical_record_attachments a where a.record_id = r.id and a.scan_status = 'clean')))
  into v_result
  from medical_records r left join healthcare_institutions i on i.id = r.institution_id
  where r.id = p_record;

  perform app.log_access('view_record', 'allowed', p_institution, v_patient, p_record, v_cat, v_perm);
  return v_result;
end $$;

-- Authorise a file download. p_institution NULL means "the patient side".
-- Returns storage details only when allowed; logs access + export either way.
create or replace function app.authorize_attachment(p_attachment uuid, p_institution uuid default null)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_att medical_record_attachments%rowtype;
  v_rec medical_records%rowtype;
  v_perm uuid;
  v_reason text;
begin
  select * into v_att from medical_record_attachments where id = p_attachment;
  if found then select * into v_rec from medical_records where id = v_att.record_id; end if;

  if p_institution is null then
    if v_att.id is null or not app.can_act_for_patient(v_rec.patient_id) then
      return jsonb_build_object('allowed', false, 'reason', 'not_found');
    end if;
    if v_att.scan_status <> 'clean' then
      return jsonb_build_object('allowed', false, 'reason', 'file_not_available');
    end if;
    insert into export_events(patient_id, actor_user_id, export_type, record_ids, destination)
    values (v_rec.patient_id, app.uid(), 'attachment_download', array[v_rec.id], 'self_download');
    return jsonb_build_object('allowed', true, 'storage_key', v_att.storage_key, 'file_name', v_att.file_name,
                              'mime_type', v_att.mime_type, 'size_bytes', v_att.size_bytes, 'sha256', v_att.sha256);
  end if;

  v_reason := app.provider_denial_reason(p_institution, 'records:view_authorized');
  if v_reason is null and v_att.id is null then v_reason := 'not_found'; end if;
  if v_reason is null then
    v_perm := app.authorizing_permission(p_institution, v_rec.id);
    if v_perm is null then v_reason := 'outside_permission_scope'; end if;
  end if;
  if v_reason is null and v_att.scan_status <> 'clean' then v_reason := 'file_not_available'; end if;

  if v_reason is not null then
    perform app.log_access('download_attachment', 'denied', p_institution, v_rec.patient_id, v_rec.id,
                           v_rec.category_key, null, v_reason);
    return jsonb_build_object('allowed', false, 'reason', v_reason);
  end if;

  perform app.log_access('download_attachment', 'allowed', p_institution, v_rec.patient_id, v_rec.id, v_rec.category_key, v_perm);
  insert into export_events(patient_id, actor_user_id, institution_id, export_type, record_ids, destination, permission_id)
  values (v_rec.patient_id, app.uid(), p_institution, 'attachment_download', array[v_rec.id], 'institution', v_perm);
  return jsonb_build_object('allowed', true, 'storage_key', v_att.storage_key, 'file_name', v_att.file_name,
                            'mime_type', v_att.mime_type, 'size_bytes', v_att.size_bytes, 'sha256', v_att.sha256);
end $$;

-- ===========================================================================
-- PROVIDER: clinical record submission
-- ===========================================================================
create or replace function app.submit_clinical_record(
  p_institution uuid, p_patient uuid, p_category text, p_title text, p_description text,
  p_clinical_date date, p_structured jsonb, p_attest_encounter boolean, p_encounter_date date,
  p_attachments jsonb default '[]')   -- [{storage_key,file_name,mime_type,size_bytes,sha256,scan_status,scan_detail}]
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_reason text;
  v_record uuid;
  v_pro healthcare_professionals%rowtype;
  v_dupe uuid;
  v_att jsonb;
  v_inst_name text;
begin
  v_reason := app.provider_denial_reason(p_institution, 'records:submit');
  if v_reason is not null then
    perform app.log_access('submit_record', 'denied', p_institution, p_patient, null, p_category, null, v_reason);
    -- Commit the denial log, then refuse.
    return null;
  end if;
  if not exists (select 1 from patients where id = p_patient and verification_status = 'verified' and status = 'active') then
    perform app.fail('NP404', 'Patient not found or not verified.');
  end if;
  if p_category not in (select key from medical_record_categories) then
    perform app.fail('NP400', 'Unknown record category.');
  end if;
  if p_clinical_date is null or p_clinical_date > current_date then
    perform app.fail('NP400', 'Enter the date of the clinical event (it cannot be in the future).');
  end if;

  -- Association: an existing care relationship, an active permission, or a
  -- fresh attestation of an encounter at this institution.
  if not exists (select 1 from care_relationships where patient_id = p_patient and institution_id = p_institution)
     and cardinality(app.active_permission_ids(p_institution, p_patient)) = 0 then
    if not coalesce(p_attest_encounter, false) or p_encounter_date is null then
      perform app.fail('NP409', 'Confirm that this patient was seen at your institution before submitting records.');
    end if;
    insert into care_relationships(patient_id, institution_id, established_via, encounter_date, attested_by)
    values (p_patient, p_institution, 'attested_encounter', p_encounter_date, app.current_professional_id());
    perform app.audit('care_relationship.attested', 'patient', p_patient::text, p_patient, p_institution,
                      jsonb_build_object('encounter_date', p_encounter_date));
  end if;

  select * into v_pro from healthcare_professionals where user_id = app.uid();

  select id into v_dupe from medical_records
    where patient_id = p_patient and institution_id = p_institution and category_key = p_category
      and lower(title) = lower(trim(p_title)) and clinical_date = p_clinical_date
    limit 1;

  insert into medical_records(patient_id, category_key, title, description, clinical_date, source, verification_status,
                              status, institution_id, professional_id, attending_professional, submitted_by_user_id,
                              structured_data, duplicate_of)
  values (p_patient, p_category, trim(p_title), nullif(trim(p_description), ''), p_clinical_date, 'institution_submission',
          'institution_verified', 'available', p_institution, v_pro.id, v_pro.full_name, app.uid(),
          p_structured, v_dupe)
  returning id into v_record;

  for v_att in select * from jsonb_array_elements(coalesce(p_attachments, '[]')) loop
    if v_att ->> 'scan_status' <> 'clean' then
      perform app.fail('NP400', 'An attachment did not pass the security check.');
    end if;
    insert into medical_record_attachments(record_id, storage_key, file_name, mime_type, size_bytes, sha256,
                                           scan_status, scan_detail, scanned_at, uploaded_by)
    values (v_record, v_att ->> 'storage_key', v_att ->> 'file_name', v_att ->> 'mime_type',
            (v_att ->> 'size_bytes')::integer, v_att ->> 'sha256', 'clean', v_att ->> 'scan_detail', now(), app.uid());
  end loop;

  insert into record_versions(record_id, version, change_type, snapshot, changed_by)
  values (v_record, 1, 'created', app.record_snapshot(v_record), app.uid());

  perform app.log_access('submit_record', 'allowed', p_institution, p_patient, v_record, p_category);
  perform app.audit('record.submitted', 'medical_record', v_record::text, p_patient, p_institution,
                    jsonb_build_object('category', p_category, 'possible_duplicate', v_dupe is not null,
                                       'attachments', jsonb_array_length(coalesce(p_attachments, '[]'))));
  select name into v_inst_name from healthcare_institutions where id = p_institution;
  perform app.notify_patient(p_patient, 'new_record', 'New record added to your health history',
          format('%s added a new record to your health history.', v_inst_name), '/records/' || v_record, 'info');
  return v_record;
end $$;

-- ===========================================================================
-- PROVIDER: emergency ("break-glass") access — separate, controlled workflow
-- ===========================================================================
create or replace function app.emergency_access(
  p_institution uuid, p_patient uuid, p_justification text, p_categories text[])
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_reason text;
  v_allowed text[];
  v_cats text[];
  v_hours integer := app.setting_int('emergency.max_hours', 12);
  v_perm uuid;
  v_cat text;
  v_recent integer;
  v_pending boolean;
  v_inst_name text;
begin
  v_reason := app.provider_denial_reason(p_institution, 'emergency:access');
  if v_reason is not null then
    perform app.log_access('emergency_access', 'denied', p_institution, p_patient, null, null, null, v_reason);
    return null;
  end if;
  if char_length(coalesce(trim(p_justification), '')) < 40 then
    perform app.fail('NP400', 'Describe the emergency in at least 40 characters. This justification is reviewed.');
  end if;
  if not exists (select 1 from patients where id = p_patient and status = 'active' and verification_status = 'verified') then
    perform app.fail('NP404', 'Patient not found.');
  end if;

  select array(select jsonb_array_elements_text(coalesce(app.setting('emergency.allowed_categories'),
         '["allergy","diagnosis","prescription","vaccination","discharge_summary"]'::jsonb))) into v_allowed;
  v_cats := array(select distinct c from unnest(p_categories) c where c = any(v_allowed));
  if cardinality(v_cats) = 0 then
    perform app.fail('NP400', 'Choose at least one category permitted for emergency access.');
  end if;

  select count(*) into v_recent from permissions
    where authorization_basis = 'emergency_access' and granted_by_user_id = app.uid() and granted_at > now() - interval '24 hours';
  if v_recent >= app.setting_int('emergency.max_per_professional_per_day', 3) then
    perform app.log_access('emergency_access', 'denied', p_institution, p_patient, null, null, null, 'emergency_limit_reached');
    return null;
  end if;
  if exists (select 1 from permissions where patient_id = p_patient and institution_id = p_institution
             and authorization_basis = 'emergency_access' and status = 'active' and expires_at > now()) then
    perform app.fail('NP409', 'Emergency access is already active for this patient at your institution.');
  end if;

  v_pending := exists (select 1 from access_requests where patient_id = p_patient and institution_id = p_institution
                       and status = 'pending' and respond_by > now());

  insert into permissions(reference, patient_id, institution_id, professional_id, purpose, purpose_detail,
                          authorization_basis, justification, granted_by_user_id, valid_from, expires_at, review_status)
  values (app.short_ref('EMR'), p_patient, p_institution, app.current_professional_id(), 'emergency_care',
          'Emergency access', 'emergency_access', trim(p_justification), app.uid(), now(),
          now() + make_interval(hours => v_hours), 'pending_review')
  returning id into v_perm;

  foreach v_cat in array v_cats loop
    insert into permission_scopes(permission_id, category_key) values (v_perm, v_cat);
  end loop;

  perform app.log_access('emergency_access', 'allowed', p_institution, p_patient, null, null, v_perm, null, 'emergency_care');
  perform app.audit('permission.emergency_access', 'permission', v_perm::text, p_patient, p_institution,
                    jsonb_build_object('categories', v_cats, 'hours', v_hours, 'routine_request_pending', v_pending));
  insert into security_incidents(reference, title, description, category, severity, source,
                                 related_patient_id, related_institution_id, related_user_id)
  values (app.short_ref('INC'), 'Emergency access requires retrospective review',
          format('Emergency access granted for %s hours (categories: %s).%s', v_hours, array_to_string(v_cats, ', '),
                 case when v_pending then ' A routine request was still pending at the time.' else '' end),
          'emergency_access_review', case when v_pending then 'high' else 'medium' end::incident_severity, 'automated',
          p_patient, p_institution, app.uid());
  select name into v_inst_name from healthcare_institutions where id = p_institution;
  perform app.notify_patient(p_patient, 'emergency_access', 'Emergency access to your records',
          format('%s used emergency access to view limited parts of your record. This is reviewed by the platform.', v_inst_name),
          '/activity', 'critical', true);
  perform app.notify_platform_role('security_officer', 'emergency_access', 'Emergency access needs review',
          'An emergency access event is waiting for retrospective review.', '/admin/security', 'warning');
  return v_perm;
end $$;

-- ===========================================================================
-- PATIENT: corrections, disputes, suspicious activity
-- ===========================================================================
create or replace function app.raise_record_correction(p_record uuid, p_kind correction_kind, p_details text)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_rec medical_records%rowtype;
  v_id uuid;
begin
  select * into v_rec from medical_records where id = p_record;
  if not found or not app.can_act_for_patient(v_rec.patient_id) then
    perform app.fail('NP404', 'Record not found.');
  end if;
  if char_length(coalesce(trim(p_details), '')) < 10 then
    perform app.fail('NP400', 'Tell us what is wrong in at least 10 characters.');
  end if;
  insert into record_corrections(record_id, patient_id, kind, details, raised_by)
  values (p_record, v_rec.patient_id, p_kind, trim(p_details), app.uid()) returning id into v_id;
  perform app.audit('record.correction_requested', 'medical_record', p_record::text, v_rec.patient_id, v_rec.institution_id,
                    jsonb_build_object('kind', p_kind, 'correction', v_id));
  if v_rec.institution_id is not null then
    perform app.notify_institution(v_rec.institution_id, 'records:submit', 'record_correction',
            'A patient questioned a record', 'A patient has asked for a submitted record to be reviewed.', '/provider/submissions', 'warning');
  end if;
  return v_id;
end $$;

-- Patients may withdraw THEIR OWN uploads (e.g. wrong file). Institutional
-- records are never altered by patients — they raise a correction instead.
create or replace function app.patient_mark_upload_in_error(p_record uuid, p_reason text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_rec medical_records%rowtype;
begin
  select * into v_rec from medical_records where id = p_record for update;
  if not found or not app.can_act_for_patient(v_rec.patient_id) then perform app.fail('NP404', 'Record not found.'); end if;
  if v_rec.source <> 'patient_upload' then
    perform app.fail('NP403', 'Records from institutions cannot be removed. Request a correction instead.');
  end if;
  update medical_records set status = 'entered_in_error', current_version = current_version + 1 where id = p_record;
  insert into record_versions(record_id, version, change_type, change_reason, snapshot, changed_by)
  values (p_record, v_rec.current_version + 1, 'status_changed', coalesce(nullif(trim(p_reason), ''), 'Uploaded in error'),
          app.record_snapshot(p_record), app.uid());
  perform app.audit('record.marked_in_error', 'medical_record', p_record::text, v_rec.patient_id, null, '{}');
end $$;

create or replace function app.report_suspicious_activity(p_patient uuid, p_access_event bigint, p_details text)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_ref text := app.short_ref('INC');
  v_ev access_events%rowtype;
begin
  if not app.can_act_for_patient(p_patient) then perform app.fail('NP403', 'Not permitted.'); end if;
  if char_length(coalesce(trim(p_details), '')) < 10 then
    perform app.fail('NP400', 'Tell us what looks wrong in at least 10 characters.');
  end if;
  if p_access_event is not null then
    select * into v_ev from access_events where id = p_access_event and patient_id = p_patient;
    if not found then perform app.fail('NP404', 'Activity not found.'); end if;
  end if;
  insert into security_incidents(reference, title, description, category, severity, source,
                                 related_patient_id, related_institution_id, related_user_id, reported_by)
  values (v_ref, 'Patient reported suspicious activity',
          trim(p_details) || coalesce(format(E'\n\nReferenced activity #%s (%s, %s).', v_ev.id, v_ev.action, v_ev.outcome), ''),
          'patient_report', 'high', 'patient_report', p_patient, v_ev.institution_id, v_ev.actor_user_id, app.uid());
  perform app.audit('security.patient_report', 'security_incident', v_ref, p_patient, v_ev.institution_id,
                    jsonb_build_object('access_event', p_access_event));
  perform app.notify_platform_role('security_officer', 'security_incident', 'Patient reported suspicious activity',
          'A patient reported activity on their record that they do not recognise.', '/admin/security', 'critical');
  perform app.notify_patient(p_patient, 'security', 'We received your report',
          format('Your report %s is with our security team. We will contact you through the platform.', v_ref), '/activity', 'info');
  return v_ref;
end $$;

-- ===========================================================================
-- Patient activity feed (unified, filtered, patient-scoped)
-- ===========================================================================
create or replace function app.patient_activity(
  p_patient uuid, p_from timestamptz default null, p_to timestamptz default null,
  p_institution uuid default null, p_kind text default null, p_limit integer default 50, p_offset integer default 0)
returns table (event_key text, occurred_at timestamptz, kind text, action text, outcome text,
               institution_id uuid, institution_name text, actor_name text, record_title text, category_key text,
               purpose text, authorization_ref text, access_event_id bigint, total bigint)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.can_act_for_patient(p_patient) then perform app.fail('NP403', 'Not permitted.'); end if;
  return query
  with feed as (
    select 'ae-' || e.id as event_key, e.occurred_at,
           case when e.outcome = 'denied' then 'blocked'
                when e.action in ('view_record','view_record_list','view_patient_summary') then 'viewed'
                when e.action = 'download_attachment' then 'downloaded'
                when e.action = 'submit_record' then 'submitted'
                when e.action = 'emergency_access' then 'emergency'
                when e.action = 'search_patient' then 'lookup'
                else 'other' end as kind,
           e.action::text as action, e.outcome::text as outcome, e.institution_id, i.name as institution_name,
           case when e.outcome = 'allowed' then hp.full_name end as actor_name,
           r.title as record_title, coalesce(e.category_key, r.category_key) as category_key,
           coalesce(pm.purpose::text, e.purpose) as purpose, pm.reference as authorization_ref, e.id as access_event_id
    from access_events e
    left join healthcare_institutions i on i.id = e.institution_id
    left join healthcare_professionals hp on hp.id = e.actor_professional_id
    left join medical_records r on r.id = e.record_id
    left join permissions pm on pm.id = e.permission_id
    where e.patient_id = p_patient
    union all
    select 'al-' || a.id, a.occurred_at,
           case when a.action like 'access_request.%' then 'request'
                when a.action like 'permission.%' then 'permission'
                when a.action like 'record.%' then 'record'
                else 'other' end,
           a.action, 'recorded', a.institution_id, i.name, null, r.title, a.metadata ->> 'category',
           null, coalesce(pm.reference, ar.reference), null::bigint
    from audit_logs a
    left join healthcare_institutions i on i.id = a.institution_id
    left join medical_records r on a.entity_type = 'medical_record' and r.id::text = a.entity_id
    left join permissions pm on a.entity_type = 'permission' and pm.id::text = a.entity_id
    left join access_requests ar on a.entity_type = 'access_request' and ar.id::text = a.entity_id
    where a.patient_id = p_patient
      and a.action in ('access_request.created','access_request.rejected','access_request.cancelled','access_request.expired',
                       'permission.granted','permission.revoked','permission.expired','permission.emergency_access',
                       'permission.suspended','record.uploaded_by_patient','record.correction_requested','record.marked_in_error')
    union all
    select 'ex-' || x.id, x.occurred_at, 'exported', x.export_type, 'recorded', x.institution_id, i.name,
           null, (select string_agg(r.title, ', ') from medical_records r where r.id = any(x.record_ids)), null,
           x.destination, null, null::bigint
    from export_events x left join healthcare_institutions i on i.id = x.institution_id
    where x.patient_id = p_patient
  )
  select f.*, count(*) over () from feed f
  where (p_from is null or f.occurred_at >= p_from)
    and (p_to is null or f.occurred_at < p_to)
    and (p_institution is null or f.institution_id = p_institution)
    and (p_kind is null or f.kind = p_kind)
  order by f.occurred_at desc
  limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0);
end $$;

-- ===========================================================================
-- Institutions & staff
-- ===========================================================================
create or replace function app.register_institution(p jsonb) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
  v_pro uuid;
  v_role uuid;
  v_user users%rowtype;
begin
  select * into v_user from users where id = app.uid() and status = 'active';
  if not found then perform app.fail('NP403', 'Sign in to register an institution.'); end if;
  if v_user.email_verified_at is null then perform app.fail('NP403', 'Verify your email address first.'); end if;

  insert into healthcare_institutions(name, institution_type, registration_number, license_number, license_authority,
      license_expires_on, address_line, city, state, lga, email, phone, website, representative_name,
      representative_title, representative_email, representative_phone, created_by, status)
  values (p->>'name', (p->>'institution_type')::institution_type, nullif(p->>'registration_number',''),
      nullif(p->>'license_number',''), nullif(p->>'license_authority',''), nullif(p->>'license_expires_on','')::date,
      p->>'address_line', p->>'city', p->>'state', nullif(p->>'lga',''), p->>'email', p->>'phone', nullif(p->>'website',''),
      p->>'representative_name', p->>'representative_title', p->>'representative_email', p->>'representative_phone',
      app.uid(), 'draft')
  returning id into v_id;

  select id into v_pro from healthcare_professionals where user_id = app.uid();
  if v_pro is null then
    insert into healthcare_professionals(user_id, full_name, profession, verification_status)
    values (app.uid(), coalesce(p->>'representative_name', v_user.display_name), 'administrator', 'unverified')
    returning id into v_pro;
  end if;
  select id into v_role from roles where key = 'institution_admin';
  insert into professional_affiliations(professional_id, institution_id, role_id, status, created_by)
  values (v_pro, v_id, v_role, 'active', app.uid());

  perform app.audit('institution.registered', 'institution', v_id::text, null, v_id, jsonb_build_object('name', p->>'name'));
  return v_id;
end $$;

create or replace function app.update_institution_draft(p_institution uuid, p jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_inst healthcare_institutions%rowtype;
begin
  select * into v_inst from healthcare_institutions where id = p_institution for update;
  if not found or v_inst.created_by <> app.uid() then perform app.fail('NP404', 'Institution not found.'); end if;
  if v_inst.status not in ('draft', 'rejected') then
    perform app.fail('NP409', 'This application is with the review team and cannot be edited.');
  end if;
  update healthcare_institutions set
    name = p->>'name', institution_type = (p->>'institution_type')::institution_type,
    registration_number = nullif(p->>'registration_number',''), license_number = nullif(p->>'license_number',''),
    license_authority = nullif(p->>'license_authority',''), license_expires_on = nullif(p->>'license_expires_on','')::date,
    address_line = p->>'address_line', city = p->>'city', state = p->>'state', lga = nullif(p->>'lga',''),
    email = p->>'email', phone = p->>'phone', website = nullif(p->>'website',''),
    representative_name = p->>'representative_name', representative_title = p->>'representative_title',
    representative_email = p->>'representative_email', representative_phone = p->>'representative_phone',
    status = 'draft'
  where id = p_institution;
  perform app.audit('institution.updated', 'institution', p_institution::text, null, p_institution, '{}');
end $$;

create or replace function app.add_institution_document(
  p_institution uuid, p_type text, p_storage_key text, p_file_name text, p_mime text, p_size integer, p_sha256 text)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_inst healthcare_institutions%rowtype;
begin
  select * into v_inst from healthcare_institutions where id = p_institution;
  if not found or (v_inst.created_by <> app.uid() and not app.has_capability(p_institution, 'institution:manage')) then
    perform app.fail('NP404', 'Institution not found.');
  end if;
  if v_inst.status not in ('draft', 'rejected', 'approved') then
    perform app.fail('NP409', 'Documents cannot be changed while the application is under review.');
  end if;
  insert into institution_documents(institution_id, document_type, storage_key, file_name, mime_type, size_bytes, sha256, uploaded_by)
  values (p_institution, p_type, p_storage_key, p_file_name, p_mime, p_size, p_sha256, app.uid()) returning id into v_id;
  perform app.audit('institution.document_added', 'institution', p_institution::text, null, p_institution,
                    jsonb_build_object('document_type', p_type));
  return v_id;
end $$;

create or replace function app.submit_institution(p_institution uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_inst healthcare_institutions%rowtype;
begin
  select * into v_inst from healthcare_institutions where id = p_institution for update;
  if not found or v_inst.created_by <> app.uid() then perform app.fail('NP404', 'Institution not found.'); end if;
  if v_inst.status not in ('draft', 'rejected') then perform app.fail('NP409', 'Already submitted.'); end if;
  if v_inst.registration_number is null or v_inst.license_number is null or v_inst.representative_name is null
     or v_inst.address_line is null or v_inst.state is null then
    perform app.fail('NP400', 'Complete the registration, licence, address and representative details first.');
  end if;
  if not exists (select 1 from institution_documents where institution_id = p_institution and document_type = 'operating_license') then
    perform app.fail('NP400', 'Upload your operating licence before submitting.');
  end if;
  update healthcare_institutions set status = 'submitted', submitted_at = now(), status_reason = null where id = p_institution;
  perform app.audit('institution.submitted', 'institution', p_institution::text, null, p_institution, '{}');
  perform app.notify_platform_role('platform_admin', 'institution_application', 'New institution application',
          format('%s submitted an application for verification.', v_inst.name), '/admin/institutions/' || p_institution, 'info');
end $$;

create or replace function app.invite_staff(
  p_institution uuid, p_email citext, p_full_name text, p_role_key text, p_token_hash text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_role roles%rowtype; v_id uuid;
begin
  if not app.has_capability(p_institution, 'staff:manage') then
    perform app.fail('NP403', 'Only institution administrators can invite staff.');
  end if;
  select * into v_role from roles where key = p_role_key and scope = 'institution';
  if not found then perform app.fail('NP400', 'Choose a valid role.'); end if;
  update staff_invitations set status = 'cancelled' where institution_id = p_institution and email = p_email and status = 'pending';
  insert into staff_invitations(institution_id, email, full_name, role_id, token_hash, invited_by, expires_at)
  values (p_institution, p_email, trim(p_full_name), v_role.id, p_token_hash, app.uid(), now() + interval '7 days')
  returning id into v_id;
  perform app.audit('staff.invited', 'staff_invitation', v_id::text, null, p_institution,
                    jsonb_build_object('role', p_role_key));
  return v_id;
end $$;

create or replace function app.accept_staff_invitation(
  p_token_hash text, p_full_name text, p_profession profession, p_license_body text, p_license_number text,
  p_license_expires date) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_inv staff_invitations%rowtype;
  v_user users%rowtype;
  v_pro uuid;
  v_aff uuid;
begin
  select * into v_inv from staff_invitations where token_hash = p_token_hash for update;
  if not found or v_inv.status <> 'pending' or v_inv.expires_at <= now() then
    perform app.fail('NP404', 'This invitation is invalid or has expired. Ask your administrator for a new one.');
  end if;
  select * into v_user from users where id = app.uid() and status = 'active';
  if not found or v_user.email <> v_inv.email or v_user.email_verified_at is null then
    perform app.fail('NP403', 'Sign in with the verified email address the invitation was sent to.');
  end if;

  select id into v_pro from healthcare_professionals where user_id = app.uid();
  if v_pro is null then
    insert into healthcare_professionals(user_id, full_name, profession, license_body, license_number, license_expires_on, verification_status)
    values (app.uid(), trim(p_full_name), p_profession, nullif(p_license_body, ''), nullif(p_license_number, ''), p_license_expires,
            case when p_profession = 'administrator' then 'unverified' else 'pending' end)
    returning id into v_pro;
  else
    update healthcare_professionals set full_name = trim(p_full_name), profession = p_profession,
           license_body = nullif(p_license_body, ''), license_number = nullif(p_license_number, ''),
           license_expires_on = p_license_expires,
           verification_status = case when verification_status = 'verified'
                                        and license_number is not distinct from nullif(p_license_number, '') then 'verified'
                                      when p_profession = 'administrator' then 'unverified' else 'pending' end
     where id = v_pro;
  end if;

  if exists (select 1 from professional_affiliations where professional_id = v_pro and institution_id = v_inv.institution_id
             and status in ('active','suspended')) then
    perform app.fail('NP409', 'You are already a member of this institution.');
  end if;

  insert into professional_affiliations(professional_id, institution_id, role_id, status, created_by)
  values (v_pro, v_inv.institution_id, v_inv.role_id, 'active', v_inv.invited_by) returning id into v_aff;
  update staff_invitations set status = 'accepted', accepted_at = now(), accepted_user_id = app.uid() where id = v_inv.id;

  perform app.audit('staff.joined', 'professional_affiliation', v_aff::text, null, v_inv.institution_id,
                    jsonb_build_object('profession', p_profession));
  perform app.notify_institution(v_inv.institution_id, 'staff:manage', 'staff', 'Invitation accepted',
          format('%s joined your institution. Their licence is awaiting platform verification.', trim(p_full_name)),
          '/provider/staff', 'info');
  perform app.notify_platform_role('platform_admin', 'professional_verification', 'Professional awaiting verification',
          'A healthcare professional submitted licence details for verification.', '/admin/professionals', 'info');
  return v_aff;
end $$;

create or replace function app.set_affiliation_status(p_affiliation uuid, p_status affiliation_status, p_reason text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_aff professional_affiliations%rowtype;
  v_pro healthcare_professionals%rowtype;
  r record;
begin
  select * into v_aff from professional_affiliations where id = p_affiliation for update;
  if not found then perform app.fail('NP404', 'Staff member not found.'); end if;
  if not (app.has_capability(v_aff.institution_id, 'staff:manage') or app.has_platform_role('platform_admin')) then
    perform app.fail('NP403', 'Only institution administrators can change staff access.');
  end if;
  select * into v_pro from healthcare_professionals where id = v_aff.professional_id;
  if v_pro.user_id = app.uid() then perform app.fail('NP409', 'You cannot change your own access.'); end if;
  if v_aff.status in ('revoked', 'ended') then perform app.fail('NP409', 'This membership has already ended.'); end if;
  if p_status = v_aff.status then return; end if;

  update professional_affiliations set status = p_status,
         ended_at = case when p_status in ('revoked','ended') then now() end,
         end_reason = nullif(trim(p_reason), '')
   where id = p_affiliation;

  -- Permissions granted to this professional personally end with the membership.
  if p_status in ('revoked', 'ended') then
    for r in select id, patient_id, reference from permissions
             where institution_id = v_aff.institution_id and professional_id = v_aff.professional_id
               and status = 'active' and expires_at > now() loop
      update permissions set status = 'revoked', revoked_at = now(), revoked_by_user_id = app.uid(),
             revocation_reason = 'Professional left the institution' where id = r.id;
      perform app.notify_patient(r.patient_id, 'permission_revoked', 'Access ended',
              'A professional you had shared records with has left their institution, so their access has ended.',
              '/access?tab=revoked', 'info');
    end loop;
  end if;

  perform app.audit('staff.status_changed', 'professional_affiliation', p_affiliation::text, null, v_aff.institution_id,
                    jsonb_build_object('from', v_aff.status, 'to', p_status));
  perform app.notify(v_pro.user_id, 'staff', 'Your institutional access changed',
          format('Your access at the institution is now %s.', p_status), '/provider', 'warning');
end $$;

-- ===========================================================================
-- Administration (no clinical access anywhere in here)
-- ===========================================================================
create or replace function app.admin_set_institution_status(p_institution uuid, p_status institution_status, p_reason text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_inst healthcare_institutions%rowtype;
  v_ok boolean;
  r record;
begin
  if not app.has_platform_role('platform_admin') then perform app.fail('NP403', 'Platform administrators only.'); end if;
  select * into v_inst from healthcare_institutions where id = p_institution for update;
  if not found then perform app.fail('NP404', 'Institution not found.'); end if;

  v_ok := (v_inst.status, p_status) in (
    ('submitted','under_review'), ('submitted','approved'), ('submitted','rejected'),
    ('under_review','approved'), ('under_review','rejected'),
    ('approved','suspended'), ('suspended','approved'));
  if not v_ok then
    perform app.fail('NP409', format('An institution cannot move from %s to %s.', v_inst.status, p_status));
  end if;
  if p_status in ('rejected','suspended') and char_length(coalesce(trim(p_reason), '')) < 10 then
    perform app.fail('NP400', 'Give a reason of at least 10 characters. It is shared with the institution.');
  end if;

  update healthcare_institutions set status = p_status, status_reason = nullif(trim(p_reason), ''),
         reviewed_at = now(), reviewed_by = app.uid() where id = p_institution;

  if p_status = 'suspended' then
    for r in select id, patient_id from permissions where institution_id = p_institution and status = 'active' loop
      update permissions set status = 'suspended', revocation_reason = 'institution_suspended' where id = r.id;
      perform app.notify_patient(r.patient_id, 'permission_suspended', 'Access paused',
              format('%s has been suspended on the platform, so its access to your records is paused.', v_inst.name),
              '/access?tab=active', 'warning');
    end loop;
    update access_requests set status = 'cancelled', decided_at = now(), decision_note = 'Institution suspended'
     where institution_id = p_institution and status = 'pending';
  elsif v_inst.status = 'suspended' and p_status = 'approved' then
    update permissions set status = 'active', revocation_reason = null
     where institution_id = p_institution and status = 'suspended' and revocation_reason = 'institution_suspended'
       and expires_at > now();
  end if;

  perform app.audit('admin.institution_status', 'institution', p_institution::text, null, p_institution,
                    jsonb_build_object('from', v_inst.status, 'to', p_status, 'reason', p_reason));
  perform app.notify_institution(p_institution, 'staff:manage', 'institution_status',
          format('Institution status: %s', replace(p_status::text, '_', ' ')),
          coalesce(nullif(trim(p_reason), ''), 'Your institution status was updated by the platform team.'),
          '/provider', case when p_status = 'approved' then 'success' else 'warning' end::notification_severity);
  perform app.notify(v_inst.created_by, 'institution_status', format('Institution status: %s', replace(p_status::text, '_', ' ')),
          coalesce(nullif(trim(p_reason), ''), 'Your institution status was updated.'), '/provider', 'info');
end $$;

create or replace function app.admin_set_professional_status(p_professional uuid, p_status professional_status, p_reason text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_pro healthcare_professionals%rowtype;
begin
  if not app.has_platform_role('platform_admin') then perform app.fail('NP403', 'Platform administrators only.'); end if;
  select * into v_pro from healthcare_professionals where id = p_professional for update;
  if not found then perform app.fail('NP404', 'Professional not found.'); end if;
  if p_status = 'verified' and (v_pro.license_number is null or v_pro.license_body is null) then
    perform app.fail('NP409', 'A licence body and number are required before verification.');
  end if;
  if p_status in ('rejected','suspended') and char_length(coalesce(trim(p_reason), '')) < 10 then
    perform app.fail('NP400', 'Give a reason of at least 10 characters.');
  end if;
  update healthcare_professionals set verification_status = p_status, status_reason = nullif(trim(p_reason), ''),
         verified_at = case when p_status = 'verified' then now() else verified_at end,
         verified_by = case when p_status = 'verified' then app.uid() else verified_by end
   where id = p_professional;
  perform app.audit('admin.professional_status', 'healthcare_professional', p_professional::text, null, null,
                    jsonb_build_object('from', v_pro.verification_status, 'to', p_status, 'reason', p_reason));
  perform app.notify(v_pro.user_id, 'professional_verification', format('Licence verification: %s', p_status),
          coalesce(nullif(trim(p_reason), ''), 'Your professional verification status changed.'), '/provider',
          case when p_status = 'verified' then 'success' else 'warning' end::notification_severity);
end $$;

create or replace function app.admin_set_user_status(p_user uuid, p_status user_status, p_reason text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_old user_status;
begin
  if not (app.has_platform_role('platform_admin') or app.has_platform_role('support_agent')) then
    perform app.fail('NP403', 'Not permitted.');
  end if;
  if p_user = app.uid() then perform app.fail('NP409', 'You cannot change your own account status.'); end if;
  if char_length(coalesce(trim(p_reason), '')) < 10 then perform app.fail('NP400', 'Give a reason of at least 10 characters.'); end if;
  select status into v_old from users where id = p_user for update;
  if not found then perform app.fail('NP404', 'Account not found.'); end if;
  update users set status = p_status,
         failed_login_count = case when p_status = 'active' then 0 else failed_login_count end,
         locked_until = case when p_status = 'active' then null else locked_until end
   where id = p_user;
  if p_status <> 'active' then
    update auth_sessions set revoked_at = now(), revoked_reason = 'account_' || p_status where user_id = p_user and revoked_at is null;
  end if;
  perform app.audit('admin.user_status', 'user', p_user::text, (select id from patients where user_id = p_user), null,
                    jsonb_build_object('from', v_old, 'to', p_status, 'reason', p_reason));
  perform app.notify(p_user, 'security', 'Your account status changed',
          format('Your account is now %s. Contact support if you did not expect this.', p_status), '/settings', 'critical', true);
end $$;

create or replace function app.admin_decide_identity(p_verification uuid, p_status verification_status, p_reason text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_iv identity_verifications%rowtype;
begin
  if not (app.has_platform_role('platform_admin') or app.has_platform_role('support_agent')) then
    perform app.fail('NP403', 'Not permitted.');
  end if;
  if p_status not in ('verified', 'failed') then perform app.fail('NP400', 'Decide verified or failed.'); end if;
  select * into v_iv from identity_verifications where id = p_verification for update;
  if not found then perform app.fail('NP404', 'Verification not found.'); end if;
  if v_iv.status not in ('pending', 'under_review') then perform app.fail('NP409', 'Already decided.'); end if;
  update identity_verifications set status = p_status, decided_at = now(), decided_by = app.uid(),
         failure_reason = case when p_status = 'failed' then p_reason end where id = p_verification;
  if v_iv.patient_id is not null then
    update patients set verification_status = p_status,
           verified_at = case when p_status = 'verified' then now() else verified_at end
     where id = v_iv.patient_id;
  end if;
  perform app.audit('admin.identity_decision', 'identity_verification', p_verification::text, v_iv.patient_id, null,
                    jsonb_build_object('status', p_status));
  perform app.notify(v_iv.user_id, 'identity', case when p_status = 'verified' then 'Identity verified' else 'Identity could not be verified' end,
          case when p_status = 'verified' then 'Your identity has been confirmed. Providers can now find you to request access.'
               else coalesce(p_reason, 'We could not confirm your identity. Contact support for help.') end,
          '/settings/identity', case when p_status = 'verified' then 'success' else 'warning' end::notification_severity, true);
end $$;

create or replace function app.admin_review_emergency(p_permission uuid, p_outcome review_status, p_note text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_perm permissions%rowtype;
begin
  if not app.has_platform_role('security_officer') then perform app.fail('NP403', 'Security officers only.'); end if;
  if p_outcome not in ('appropriate', 'inappropriate') then perform app.fail('NP400', 'Choose an outcome.'); end if;
  if char_length(coalesce(trim(p_note), '')) < 10 then perform app.fail('NP400', 'Record review notes (10+ characters).'); end if;
  select * into v_perm from permissions where id = p_permission and authorization_basis = 'emergency_access' for update;
  if not found then perform app.fail('NP404', 'Emergency access event not found.'); end if;
  update permissions set review_status = p_outcome, reviewed_by = app.uid(), reviewed_at = now(), review_note = trim(p_note),
         status = case when p_outcome = 'inappropriate' and status = 'active' then 'revoked' else status end,
         revoked_at = case when p_outcome = 'inappropriate' and status = 'active' then now() else revoked_at end,
         revocation_reason = case when p_outcome = 'inappropriate' and status = 'active' then 'Emergency access judged inappropriate' else revocation_reason end
   where id = p_permission;
  update security_incidents set status = 'resolved', resolved_at = now(), resolution_note = trim(p_note)
   where category = 'emergency_access_review' and related_patient_id = v_perm.patient_id
     and related_institution_id = v_perm.institution_id and status in ('open','investigating');
  perform app.audit('admin.emergency_review', 'permission', p_permission::text, v_perm.patient_id, v_perm.institution_id,
                    jsonb_build_object('outcome', p_outcome));
  perform app.notify_patient(v_perm.patient_id, 'emergency_access', 'Emergency access reviewed',
          case when p_outcome = 'appropriate' then 'The platform reviewed the emergency access to your records and found it appropriate.'
               else 'The platform found an emergency access to your records inappropriate and has taken action.' end,
          '/activity', 'info', true);
end $$;

create or replace function app.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.is_platform_staff() then perform app.fail('NP403', 'Platform staff only.'); end if;
  return jsonb_build_object(
    'patients', (select count(*) from patients),
    'verified_patients', (select count(*) from patients where verification_status = 'verified'),
    'institutions', (select count(*) from healthcare_institutions where status <> 'draft'),
    'verified_institutions', (select count(*) from healthcare_institutions where status = 'approved'),
    'pending_institutions', (select count(*) from healthcare_institutions where status in ('submitted','under_review')),
    'active_professionals', (select count(distinct a.professional_id) from professional_affiliations a
                              join healthcare_professionals p on p.id = a.professional_id
                              where a.status = 'active' and p.verification_status = 'verified'),
    'pending_professionals', (select count(*) from healthcare_professionals where verification_status = 'pending'),
    'records_submitted', (select count(*) from medical_records where source <> 'patient_upload'),
    'records_uploaded', (select count(*) from medical_records where source = 'patient_upload'),
    'open_incidents', (select count(*) from security_incidents where status in ('open','investigating')),
    'pending_identity', (select count(*) from identity_verifications where status in ('pending','under_review')),
    'open_tickets', (select count(*) from support_tickets where status in ('open','in_progress','awaiting_requester')),
    'denied_24h', (select count(*) from access_events where outcome = 'denied' and occurred_at > now() - interval '24 hours'),
    'requests_by_status', (select coalesce(jsonb_object_agg(status, n), '{}') from
                            (select status, count(*) n from access_requests group by status) s),
    'access_daily', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'allowed', a, 'denied', dn) order by d), '[]') from (
                       select g.d, count(e.*) filter (where e.outcome = 'allowed') a, count(e.*) filter (where e.outcome = 'denied') dn
                       from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') g(d)
                       left join access_events e on date_trunc('day', e.occurred_at) = g.d
                       group by g.d) x)
  );
end $$;

-- Support metadata only: no records, no clinical fields.
create or replace function app.admin_list_patients(p_query text default null, p_limit integer default 50, p_offset integer default 0)
returns table (patient_id uuid, user_id uuid, full_name text, email citext, phone text, health_id text,
               account_status user_status, patient_status patient_status, verification_status verification_status,
               created_at timestamptz, last_login_at timestamptz, is_synthetic boolean, total bigint)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not (app.has_platform_role('platform_admin') or app.has_platform_role('support_agent')) then
    perform app.fail('NP403', 'Not permitted.');
  end if;
  return query
    select pt.id, u.id, pp.full_name, u.email, u.phone, h.value, u.status, pt.status, pt.verification_status,
           pt.created_at, u.last_login_at, pt.is_synthetic, count(*) over ()
    from patients pt
    join patient_profiles pp on pp.patient_id = pt.id
    left join users u on u.id = pt.user_id
    left join health_identifiers h on h.patient_id = pt.id and h.identifier_type = 'platform_hid'
    where p_query is null or p_query = ''
       or pp.full_name ilike '%' || p_query || '%' or u.email ilike '%' || p_query || '%' or h.value = upper(p_query)
    order by pt.created_at desc
    limit least(p_limit, 200) offset p_offset;
end $$;

-- ===========================================================================
-- Scheduled maintenance: expiry + expiry warnings (idempotent)
-- ===========================================================================
create or replace function app.run_expiry() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r record;
  v_perms integer := 0;
  v_reqs integer := 0;
  v_warn integer := 0;
begin
  for r in update permissions set status = 'expired'
           where status = 'active' and expires_at <= now()
           returning id, patient_id, institution_id, reference loop
    v_perms := v_perms + 1;
    perform app.audit('permission.expired', 'permission', r.id::text, r.patient_id, r.institution_id, '{}');
    perform app.notify_patient(r.patient_id, 'permission_expired', 'Access expired',
            'A permission you granted has reached its end date. The institution can no longer view those records.',
            '/access?tab=expired', 'info');
    perform app.notify_institution(r.institution_id, 'records:view_authorized', 'permission_expired', 'Patient access expired',
            format('Permission %s has expired.', r.reference), '/provider/patients', 'info');
  end loop;

  for r in update access_requests set status = 'expired'
           where status = 'pending' and respond_by <= now()
           returning id, patient_id, institution_id, requested_by_user_id, reference loop
    v_reqs := v_reqs + 1;
    perform app.audit('access_request.expired', 'access_request', r.id::text, r.patient_id, r.institution_id, '{}');
    perform app.notify(r.requested_by_user_id, 'access_request_decision', 'Access request expired',
            format('Request %s expired without a response. No access was granted.', r.reference), '/provider/requests', 'info');
  end loop;

  for r in update permissions set expiry_notice_sent_at = now()
           where status = 'active' and expiry_notice_sent_at is null and authorization_basis <> 'emergency_access'
             and expires_at > now() and expires_at <= now() + interval '48 hours'
           returning id, institution_id, reference loop
    v_warn := v_warn + 1;
    perform app.notify_institution(r.institution_id, 'records:view_authorized', 'permission_expiring', 'Patient access expiring soon',
            format('Permission %s expires within 48 hours.', r.reference), '/provider/patients', 'warning');
  end loop;

  return jsonb_build_object('permissions_expired', v_perms, 'requests_expired', v_reqs, 'expiry_warnings', v_warn);
end $$;
