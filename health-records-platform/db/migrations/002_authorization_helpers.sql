-- ===========================================================================
-- 002 — Identity & authorization helpers
--
-- Every authorization decision in the database is derived from ONE value: the
-- `sub` claim in request.jwt.claims, set by the server per transaction
-- (Supabase sets the same claim from the verified JWT). Nothing the client
-- sends is trusted to identify the actor.
--
-- All SECURITY DEFINER functions pin search_path to stop object-shadowing.
-- `extensions` is listed for Supabase (where pgcrypto lives); it is ignored
-- locally where it does not exist.
-- ===========================================================================

create or replace function app.claims() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

create or replace function app.uid() returns uuid
language sql stable as $$
  select nullif(app.claims() ->> 'sub', '')::uuid
$$;

create or replace function app.request_ip() returns inet
language plpgsql stable as $$
begin
  return nullif(app.claims() ->> 'ip', '')::inet;
exception when others then
  return null;
end $$;

create or replace function app.setting(p_key text) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select value from platform_settings where key = p_key
$$;

create or replace function app.setting_int(p_key text, p_default integer) returns integer
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select (value #>> '{}')::integer from platform_settings where key = p_key), p_default)
$$;

-- The current user must exist and be active. Used as the first gate everywhere.
create or replace function app.current_user_active() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from users where id = app.uid() and status = 'active')
$$;

create or replace function app.has_platform_role(p_role text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1
    from user_platform_roles upr
    join roles r on r.id = upr.role_id and r.scope = 'platform'
    join users u on u.id = upr.user_id and u.status = 'active'
    where upr.user_id = app.uid() and r.key = p_role)
$$;

create or replace function app.is_platform_staff() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1
    from user_platform_roles upr
    join roles r on r.id = upr.role_id and r.scope = 'platform'
    join users u on u.id = upr.user_id and u.status = 'active'
    where upr.user_id = app.uid())
$$;

create or replace function app.current_patient_id() returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select p.id from patients p join users u on u.id = p.user_id
  where p.user_id = app.uid() and u.status = 'active'
$$;

create or replace function app.current_professional_id() returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select id from healthcare_professionals where user_id = app.uid()
$$;

-- May the current user act for this patient? True for the patient themself or
-- an ACTIVE, in-date, verified representative. Nobody else — not admins, not
-- providers. This is the gate for every patient-side read and decision.
create or replace function app.can_act_for_patient(p_patient_id uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select app.current_user_active() and exists (
    select 1 from patients p
    where p.id = p_patient_id
      and p.status <> 'closed'
      and (
        p.user_id = app.uid()
        or exists (
          select 1 from patient_representatives r
          where r.patient_id = p.id
            and r.representative_user_id = app.uid()
            and r.status = 'active'
            and r.valid_from <= now()
            and (r.valid_until is null or r.valid_until > now()))))
$$;

-- Capabilities that do not involve clinical information. Everything else
-- additionally requires a verified professional licence.
create or replace function app.is_administrative_capability(p_cap text) returns boolean
language sql immutable as $$
  select p_cap in ('staff:manage','institution:manage','activity:view','integrations:manage')
$$;

-- Returns NULL when the current user holds `p_cap` at `p_institution`, or a
-- machine-readable reason why not. The reason is written to access_events.
create or replace function app.provider_denial_reason(p_institution uuid, p_cap text) returns text
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := app.uid();
  v_user users%rowtype;
  v_pro healthcare_professionals%rowtype;
  v_inst healthcare_institutions%rowtype;
  v_aff professional_affiliations%rowtype;
  v_caps text[];
begin
  if v_uid is null then return 'not_authenticated'; end if;
  select * into v_user from users where id = v_uid;
  if not found or v_user.status <> 'active' then return 'account_inactive'; end if;
  select * into v_pro from healthcare_professionals where user_id = v_uid;
  if not found then return 'not_a_professional'; end if;
  select * into v_inst from healthcare_institutions where id = p_institution;
  if not found then return 'institution_not_found'; end if;
  if v_inst.status <> 'approved' then return 'institution_not_approved'; end if;
  select * into v_aff from professional_affiliations
    where professional_id = v_pro.id and institution_id = p_institution and status in ('active','suspended');
  if not found then return 'no_affiliation'; end if;
  if v_aff.status <> 'active' then return 'affiliation_suspended'; end if;
  select capabilities into v_caps from roles where id = v_aff.role_id;
  if not (p_cap = any(v_caps)) then return 'missing_capability'; end if;
  if not app.is_administrative_capability(p_cap) and v_pro.verification_status <> 'verified' then
    return 'professional_not_verified';
  end if;
  return null;
end $$;

create or replace function app.has_capability(p_institution uuid, p_cap text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select app.provider_denial_reason(p_institution, p_cap) is null
$$;

-- Is the current user an (active) member of the institution, in any role?
-- Used for read-only visibility of the institution's own operational data.
create or replace function app.is_institution_member(p_institution uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select app.current_user_active() and exists (
    select 1 from professional_affiliations a
    join healthcare_professionals p on p.id = a.professional_id
    where p.user_id = app.uid() and a.institution_id = p_institution and a.status = 'active')
$$;

-- ---------------------------------------------------------------------------
-- The core clinical access rule.
--
-- Returns the id of the permission that authorises the current professional,
-- acting for `p_institution`, to see record `p_record_id`; NULL otherwise.
-- Checks, in order: capability (user active, professional verified,
-- affiliation active, institution approved), then a permission that is
-- active, inside its validity window (checked against now(), never trusting
-- the status column alone), scoped to the record's category or the record
-- itself, inside the permitted clinical date range, and — if it was granted to
-- a named professional — granted to this one.
-- ---------------------------------------------------------------------------
create or replace function app.authorizing_permission(p_institution uuid, p_record_id uuid) returns uuid
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_perm uuid;
begin
  if not app.has_capability(p_institution, 'records:view_authorized') then
    return null;
  end if;

  select p.id into v_perm
  from medical_records r
  join permissions p on p.patient_id = r.patient_id and p.institution_id = p_institution
  join patients pt on pt.id = r.patient_id
  where r.id = p_record_id
    and pt.status in ('active','deceased','restricted')
    and r.status in ('available','under_review','superseded')
    and p.status = 'active'
    and now() >= p.valid_from
    and now() < p.expires_at
    and (p.professional_id is null or p.professional_id = app.current_professional_id())
    and (p.date_from is null or coalesce(r.clinical_date, r.created_at::date) >= p.date_from)
    and (p.date_to   is null or coalesce(r.clinical_date, r.created_at::date) <= p.date_to)
    and exists (
      select 1 from permission_scopes s
      where s.permission_id = p.id
        and s.category_key = r.category_key
        and (s.record_id is null or s.record_id = r.id))
  order by p.expires_at desc
  limit 1;

  return v_perm;
end $$;

-- Does the institution hold ANY currently valid permission for the patient?
create or replace function app.active_permission_ids(p_institution uuid, p_patient uuid) returns uuid[]
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(array_agg(p.id order by p.expires_at), '{}')
  from permissions p
  where p.patient_id = p_patient and p.institution_id = p_institution
    and p.status = 'active' and now() >= p.valid_from and now() < p.expires_at
    and (p.professional_id is null or p.professional_id = app.current_professional_id())
$$;

-- Health ID: 'NG' + 10 digits, last digit a Luhn check digit, so typos are
-- caught before a lookup is ever attempted.
create or replace function app.luhn_check_digit(p_digits text) returns integer
language plpgsql immutable as $$
declare
  total integer := 0;
  d integer;
  dbl boolean := true;
begin
  for i in reverse length(p_digits)..1 loop
    d := substr(p_digits, i, 1)::integer;
    if dbl then d := d * 2; if d > 9 then d := d - 9; end if; end if;
    total := total + d;
    dbl := not dbl;
  end loop;
  return (10 - (total % 10)) % 10;
end $$;

create or replace function app.generate_health_id() returns text
language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare
  body text;
  candidate text;
begin
  loop
    body := lpad(((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000000)::text, 9, '0');
    if left(body, 1) = '0' then continue; end if;
    candidate := 'NG' || body || app.luhn_check_digit(body)::text;
    exit when not exists (select 1 from health_identifiers where identifier_type = 'platform_hid' and value = candidate);
  end loop;
  return candidate;
end $$;

create or replace function app.is_valid_health_id(p_value text) returns boolean
language sql immutable as $$
  select p_value ~ '^NG[1-9][0-9]{9}$'
     and app.luhn_check_digit(substr(p_value, 3, 9)) = substr(p_value, 12, 1)::integer
$$;

-- "Adaeze Okafor" → "Adaeze O." — enough to confirm, not enough to profile.
create or replace function app.mask_name(p_name text) returns text
language sql immutable as $$
  select case
    when array_length(regexp_split_to_array(trim(p_name), '\s+'), 1) > 1
      then split_part(trim(p_name), ' ', 1) || ' ' ||
           left((regexp_split_to_array(trim(p_name), '\s+'))[array_length(regexp_split_to_array(trim(p_name), '\s+'), 1)], 1) || '.'
    else left(trim(p_name), 1) || repeat('•', greatest(length(trim(p_name)) - 1, 2))
  end
$$;
