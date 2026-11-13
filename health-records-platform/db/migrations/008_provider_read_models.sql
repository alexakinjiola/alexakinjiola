-- ===========================================================================
-- 008 — Provider read models
-- Narrow, capability-checked views of data that RLS intentionally hides from
-- providers (patient names, the institution's own submissions, staff emails).
-- Each returns the minimum fields its screen needs.
-- ===========================================================================

-- Patients the institution can currently access (active, in-date permission).
create or replace function app.provider_authorized_patients(p_institution uuid)
returns table (patient_id uuid, full_name text, date_of_birth date, sex sex_at_birth, health_id text,
               permission_id uuid, reference text, purpose access_purpose, basis authorization_basis,
               expires_at timestamptz, categories text[], restricted boolean)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.has_capability(p_institution, 'records:view_authorized') then return; end if;
  return query
    select pt.id, pp.full_name, pp.date_of_birth, pp.sex, h.value, p.id, p.reference, p.purpose, p.authorization_basis,
           p.expires_at, array(select distinct s.category_key from permission_scopes s where s.permission_id = p.id),
           p.professional_id is not null
    from permissions p
    join patients pt on pt.id = p.patient_id
    join patient_profiles pp on pp.patient_id = pt.id
    left join health_identifiers h on h.patient_id = pt.id and h.identifier_type = 'platform_hid'
    where p.institution_id = p_institution and p.status = 'active' and now() >= p.valid_from and now() < p.expires_at
      and (p.professional_id is null or p.professional_id = app.current_professional_id())
    order by p.expires_at;
end $$;

-- The institution's access requests, with masked patient identity.
create or replace function app.provider_requests(p_institution uuid, p_status text default null)
returns table (id uuid, reference text, patient_id uuid, patient_masked text, health_id_hint text, purpose access_purpose,
               status request_status, created_at timestamptz, respond_by timestamptz, decided_at timestamptz,
               duration_days integer, categories text[], requested_by text, permission_id uuid)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.is_institution_member(p_institution) then return; end if;
  return query
    select ar.id, ar.reference, ar.patient_id, app.mask_name(pp.full_name), '••••' || right(h.value, 4), ar.purpose,
           case when ar.status = 'pending' and ar.respond_by <= now() then 'expired'::request_status else ar.status end,
           ar.created_at, ar.respond_by, ar.decided_at, ar.requested_duration_days,
           array(select category_key from access_request_categories c where c.request_id = ar.id order by 1),
           hp.full_name, (select pm.id from permissions pm where pm.access_request_id = ar.id)
    from access_requests ar
    join patient_profiles pp on pp.patient_id = ar.patient_id
    left join health_identifiers h on h.patient_id = ar.patient_id and h.identifier_type = 'platform_hid'
    left join healthcare_professionals hp on hp.id = ar.requested_by_professional_id
    where ar.institution_id = p_institution
      and (p_status is null or ar.status::text = p_status
           or (p_status = 'expired' and ar.status = 'pending' and ar.respond_by <= now()))
      and not (p_status = 'pending' and ar.respond_by <= now())
    order by ar.created_at desc
    limit 200;
end $$;

-- Records this institution submitted: metadata only, masked patient.
create or replace function app.provider_submissions(p_institution uuid)
returns table (id uuid, title text, category_key text, clinical_date date, created_at timestamptz, status record_status,
               patient_masked text, submitted_by text, duplicate boolean, open_corrections bigint)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not (app.has_capability(p_institution, 'records:submit') or app.has_capability(p_institution, 'activity:view')) then return; end if;
  return query
    select r.id, r.title, r.category_key, r.clinical_date, r.created_at, r.status, app.mask_name(pp.full_name),
           r.attending_professional, r.duplicate_of is not null,
           (select count(*) from record_corrections c where c.record_id = r.id and c.status in ('open','under_review'))
    from medical_records r join patient_profiles pp on pp.patient_id = r.patient_id
    where r.institution_id = p_institution
    order by r.created_at desc limit 200;
end $$;

create or replace function app.institution_staff(p_institution uuid)
returns table (affiliation_id uuid, professional_id uuid, full_name text, email citext, profession profession,
               license_body text, license_number text, verification professional_status, role_key text, role_name text,
               status affiliation_status, started_at timestamptz, is_me boolean)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.has_capability(p_institution, 'staff:manage') then return; end if;
  return query
    select a.id, hp.id, hp.full_name, u.email, hp.profession, hp.license_body, hp.license_number, hp.verification_status,
           r.key, r.name, a.status, a.started_at, hp.user_id = app.uid()
    from professional_affiliations a
    join healthcare_professionals hp on hp.id = a.professional_id
    join users u on u.id = hp.user_id
    join roles r on r.id = a.role_id
    where a.institution_id = p_institution
    order by a.status, hp.full_name;
end $$;

create or replace function app.institution_activity(p_institution uuid, p_limit integer default 100)
returns table (id bigint, occurred_at timestamptz, actor_name text, action access_action, outcome access_outcome,
               denial_reason text, patient_masked text, category_key text, permission_ref text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.has_capability(p_institution, 'activity:view') then return; end if;
  return query
    select e.id, e.occurred_at, hp.full_name, e.action, e.outcome, e.denial_reason,
           case when e.patient_id is null then null else app.mask_name(pp.full_name) end, e.category_key, pm.reference
    from access_events e
    left join healthcare_professionals hp on hp.id = e.actor_professional_id
    left join patient_profiles pp on pp.patient_id = e.patient_id
    left join permissions pm on pm.id = e.permission_id
    where e.institution_id = p_institution
    order by e.occurred_at desc limit least(p_limit, 500);
end $$;

-- Minimal identity for the submission form: only for patients the institution
-- may submit to (care relationship or active permission).
create or replace function app.provider_patient_identity(p_institution uuid, p_patient uuid) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v jsonb;
begin
  if app.provider_denial_reason(p_institution, 'records:submit') is not null
     and app.provider_denial_reason(p_institution, 'access:request') is not null then
    return null;
  end if;
  select jsonb_build_object('id', pt.id, 'masked_name', app.mask_name(pp.full_name),
           'birth_year', extract(year from pp.date_of_birth)::int, 'sex', pp.sex, 'health_id_hint', '••••' || right(h.value, 4),
           'has_relationship', exists (select 1 from care_relationships c where c.patient_id = pt.id and c.institution_id = p_institution),
           'has_permission', cardinality(app.active_permission_ids(p_institution, pt.id)) > 0,
           'pending_request', exists (select 1 from access_requests ar where ar.patient_id = pt.id and ar.institution_id = p_institution and ar.status = 'pending' and ar.respond_by > now()))
    into v
  from patients pt join patient_profiles pp on pp.patient_id = pt.id
  left join health_identifiers h on h.patient_id = pt.id and h.identifier_type = 'platform_hid'
  where pt.id = p_patient and pt.status = 'active' and pt.verification_status = 'verified';
  return v;
end $$;

grant execute on function app.provider_authorized_patients(uuid), app.provider_requests(uuid, text), app.provider_submissions(uuid),
  app.institution_staff(uuid), app.institution_activity(uuid, integer), app.provider_patient_identity(uuid, uuid) to authenticated;
