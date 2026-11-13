-- ===========================================================================
-- 009 — Administration read models (support metadata only, never clinical)
-- ===========================================================================

create or replace function app.admin_users_brief(p_ids uuid[])
returns table (id uuid, display_name text, email citext, status user_status, last_login_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.is_platform_staff() then return; end if;
  return query select u.id, u.display_name, u.email, u.status, u.last_login_at from users u where u.id = any(p_ids);
end $$;

create or replace function app.admin_identity_queue()
returns table (id uuid, patient_id uuid, full_name text, date_of_birth date, email citext, provider text, method text,
               status verification_status, provider_reference text, failure_reason text, submitted_at timestamptz, nin_hint text,
               possible_duplicates bigint)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not (app.has_platform_role('platform_admin') or app.has_platform_role('support_agent')) then return; end if;
  return query
    select iv.id, iv.patient_id, pp.full_name, pp.date_of_birth, u.email, iv.provider, iv.method, iv.status, iv.provider_reference,
           iv.failure_reason, iv.submitted_at, h.display_hint,
           (select count(*) from patient_profiles x where x.patient_id <> pp.patient_id and lower(x.full_name) = lower(pp.full_name) and x.date_of_birth = pp.date_of_birth)
    from identity_verifications iv
    join patient_profiles pp on pp.patient_id = iv.patient_id
    join users u on u.id = iv.user_id
    left join health_identifiers h on h.patient_id = iv.patient_id and h.identifier_type = 'nin'
    where iv.status in ('pending','under_review')
    order by iv.submitted_at;
end $$;

create or replace function app.admin_representative_queue()
returns table (id uuid, patient_name text, patient_dob date, representative_name text, representative_email citext,
               relationship representative_relationship, status representative_status, legal_basis_note text, created_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.has_platform_role('platform_admin') then return; end if;
  return query
    select r.id, pp.full_name, pp.date_of_birth, u.display_name, u.email, r.relationship, r.status, r.legal_basis_note, r.created_at
    from patient_representatives r join patient_profiles pp on pp.patient_id = r.patient_id join users u on u.id = r.representative_user_id
    order by (r.status = 'pending_verification') desc, r.created_at desc limit 100;
end $$;

create or replace function app.admin_professionals(p_status text default null)
returns table (id uuid, user_id uuid, full_name text, email citext, profession profession, license_body text, license_number text,
               license_expires_on date, verification_status professional_status, status_reason text, created_at timestamptz,
               account_status user_status, affiliations jsonb)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.is_platform_staff() then return; end if;
  return query
    select hp.id, hp.user_id, hp.full_name, u.email, hp.profession, hp.license_body, hp.license_number, hp.license_expires_on,
           hp.verification_status, hp.status_reason, hp.created_at, u.status,
           (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'institution', i.name, 'role', r.name, 'status', a.status) order by a.created_at), '[]')
            from professional_affiliations a join healthcare_institutions i on i.id = a.institution_id join roles r on r.id = a.role_id
            where a.professional_id = hp.id)
    from healthcare_professionals hp join users u on u.id = hp.user_id
    where p_status is null or hp.verification_status::text = p_status
    order by (hp.verification_status = 'pending') desc, hp.created_at desc limit 300;
end $$;

grant execute on function app.admin_users_brief(uuid[]), app.admin_identity_queue(), app.admin_representative_queue(),
  app.admin_professionals(text) to authenticated;
