-- ===========================================================================
-- 003 — Audit, access events, notifications plumbing
--
-- • audit_logs, access_events, export_events and record_versions are
--   append-only: UPDATE / DELETE / TRUNCATE raise, and no client role holds
--   INSERT — rows are written only by SECURITY DEFINER functions.
-- • audit_logs is hash-chained so silent edits by anyone who bypasses the
--   triggers (e.g. a superuser) are still detectable via app.verify_audit_chain().
-- ===========================================================================

alter table audit_logs add column chain_seq bigint unique;

create or replace function app.forbid_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'append_only: % rows cannot be modified or deleted', tg_table_name
    using errcode = '42501';
end $$;

create trigger audit_logs_append_only before update or delete on audit_logs
  for each row execute function app.forbid_mutation();
create trigger audit_logs_no_truncate before truncate on audit_logs
  for each statement execute function app.forbid_mutation();
create trigger access_events_append_only before update or delete on access_events
  for each row execute function app.forbid_mutation();
create trigger access_events_no_truncate before truncate on access_events
  for each statement execute function app.forbid_mutation();
create trigger export_events_append_only before update or delete on export_events
  for each row execute function app.forbid_mutation();
create trigger export_events_no_truncate before truncate on export_events
  for each statement execute function app.forbid_mutation();
create trigger record_versions_append_only before update or delete on record_versions
  for each row execute function app.forbid_mutation();

create or replace function app.audit_row_digest(
  p_prev text, p_seq bigint, p_at timestamptz, p_actor uuid, p_action text, p_entity_type text,
  p_entity_id text, p_patient uuid, p_institution uuid, p_metadata jsonb) returns text
language sql immutable set search_path = public, extensions, pg_temp as $$
  select encode(digest(concat_ws('|',
    coalesce(p_prev, 'GENESIS'), p_seq::text,
    to_char(p_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'),
    coalesce(p_actor::text, '-'), p_action, p_entity_type, coalesce(p_entity_id, '-'),
    coalesce(p_patient::text, '-'), coalesce(p_institution::text, '-'), p_metadata::text), 'sha256'), 'hex')
$$;

create or replace function app.audit_chain_trigger() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_prev text;
  v_seq bigint;
begin
  -- Serialise chain extension so concurrent writers cannot fork the chain.
  perform pg_advisory_xact_lock(hashtext('audit_logs_chain'));
  select hash, chain_seq into v_prev, v_seq from audit_logs order by chain_seq desc nulls last limit 1;
  new.chain_seq := coalesce(v_seq, 0) + 1;
  new.prev_hash := v_prev;
  new.hash := app.audit_row_digest(v_prev, new.chain_seq, new.occurred_at, new.actor_user_id, new.action,
                                   new.entity_type, new.entity_id, new.patient_id, new.institution_id, new.metadata);
  return new;
end $$;

create trigger audit_logs_chain before insert on audit_logs
  for each row execute function app.audit_chain_trigger();

create or replace function app.verify_audit_chain()
returns table (valid boolean, checked bigint, first_broken_seq bigint)
language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  r record;
  v_prev text := null;
  v_n bigint := 0;
begin
  if not (app.has_platform_role('security_officer') or app.has_platform_role('platform_admin') or app.uid() is null) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  for r in select * from audit_logs order by chain_seq loop
    v_n := v_n + 1;
    if r.prev_hash is distinct from v_prev
       or r.hash <> app.audit_row_digest(r.prev_hash, r.chain_seq, r.occurred_at, r.actor_user_id, r.action,
                                         r.entity_type, r.entity_id, r.patient_id, r.institution_id, r.metadata) then
      return query select false, v_n, r.chain_seq;
      return;
    end if;
    v_prev := r.hash;
  end loop;
  return query select true, v_n, null::bigint;
end $$;

-- Write an audit entry for the current actor. Never put clinical content in
-- p_metadata — identifiers, categories and outcomes only.
create or replace function app.audit(
  p_action text, p_entity_type text, p_entity_id text,
  p_patient uuid default null, p_institution uuid default null, p_metadata jsonb default '{}')
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into audit_logs(actor_user_id, actor_type, action, entity_type, entity_id, patient_id, institution_id, metadata, ip_address)
  values (app.uid(), case when app.uid() is null then 'system' else 'user' end,
          p_action, p_entity_type, p_entity_id, p_patient, p_institution, coalesce(p_metadata, '{}'), app.request_ip());
end $$;

-- ---------------------------------------------------------------------------
-- Notifications. Security-critical notifications ignore preferences.
-- Email bodies are deliberately generic: they never contain clinical content.
-- ---------------------------------------------------------------------------
create or replace function app.notify(
  p_user uuid, p_type text, p_title text, p_body text, p_link text default null,
  p_severity notification_severity default 'info', p_security_critical boolean default false)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_in_app boolean := true;
  v_email boolean := true;
  v_addr citext;
begin
  if p_user is null then return; end if;
  if not p_security_critical then
    select in_app, email into v_in_app, v_email from notification_preferences where user_id = p_user and type = p_type;
    v_in_app := coalesce(v_in_app, true);
    v_email := coalesce(v_email, true);
  end if;

  select email into v_addr from users where id = p_user and status <> 'closed';
  if not found then return; end if;

  if v_in_app or p_security_critical then
    insert into notifications(user_id, type, title, body, link, severity, security_critical, email_status)
    values (p_user, p_type, p_title, p_body, p_link, p_severity, p_security_critical,
            case when v_email or p_security_critical then 'queued'::delivery_status else 'not_required' end);
  end if;

  if v_email or p_security_critical then
    insert into message_outbox(channel, recipient, user_id, template, subject, body)
    values ('email', v_addr, p_user, p_type, p_title,
            p_title || E'\n\nSign in to your account to see the details. For your privacy we never include health information in emails.'
            || E'\n\nIf you did not expect this message, sign in and review your security settings, or contact support.');
  end if;
end $$;

-- Notify every active member of an institution who holds a capability.
create or replace function app.notify_institution(
  p_institution uuid, p_cap text, p_type text, p_title text, p_body text, p_link text default null,
  p_severity notification_severity default 'info', p_exclude uuid default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare r record;
begin
  for r in
    select distinct p.user_id
    from professional_affiliations a
    join healthcare_professionals p on p.id = a.professional_id
    join roles ro on ro.id = a.role_id
    join users u on u.id = p.user_id and u.status = 'active'
    where a.institution_id = p_institution and a.status = 'active' and p_cap = any(ro.capabilities)
      and (p_exclude is null or p.user_id <> p_exclude)
  loop
    perform app.notify(r.user_id, p_type, p_title, p_body, p_link, p_severity, false);
  end loop;
end $$;

-- Notify the patient's account holder and every active representative.
create or replace function app.notify_patient(
  p_patient uuid, p_type text, p_title text, p_body text, p_link text default null,
  p_severity notification_severity default 'info', p_security_critical boolean default false)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare r record;
begin
  for r in
    select user_id as uid from patients where id = p_patient and user_id is not null
    union
    select representative_user_id from patient_representatives
      where patient_id = p_patient and status = 'active' and (valid_until is null or valid_until > now())
  loop
    perform app.notify(r.uid, p_type, p_title, p_body, p_link, p_severity, p_security_critical);
  end loop;
end $$;

create or replace function app.notify_platform_role(
  p_role text, p_type text, p_title text, p_body text, p_link text default null,
  p_severity notification_severity default 'info')
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare r record;
begin
  for r in
    select upr.user_id from user_platform_roles upr join roles ro on ro.id = upr.role_id
    join users u on u.id = upr.user_id and u.status = 'active'
    where ro.key = p_role
  loop
    perform app.notify(r.user_id, p_type, p_title, p_body, p_link, p_severity, false);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Access events + automatic anomaly detection
-- ---------------------------------------------------------------------------
create or replace function app.log_access(
  p_action access_action, p_outcome access_outcome, p_institution uuid, p_patient uuid,
  p_record uuid default null, p_category text default null, p_permission uuid default null,
  p_denial_reason text default null, p_purpose text default null)
returns bigint
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id bigint;
  v_recent_denials integer;
  v_distinct_patients integer;
  v_threshold integer;
begin
  insert into access_events(actor_user_id, actor_professional_id, institution_id, patient_id, record_id,
                            category_key, action, outcome, denial_reason, permission_id, purpose, ip_address)
  values (app.uid(), app.current_professional_id(), p_institution, p_patient, p_record,
          p_category, p_action, p_outcome, p_denial_reason, p_permission, p_purpose, app.request_ip())
  returning id into v_id;

  -- Rule 1: repeated denied attempts by one actor in 10 minutes.
  if p_outcome = 'denied' and app.uid() is not null then
    v_threshold := app.setting_int('security.denied_attempts_threshold', 5);
    select count(*) into v_recent_denials from access_events
      where actor_user_id = app.uid() and outcome = 'denied' and occurred_at > now() - interval '10 minutes';
    if v_recent_denials >= v_threshold and not exists (
        select 1 from security_incidents
        where related_user_id = app.uid() and category = 'repeated_denials' and status in ('open','investigating')
          and created_at > now() - interval '1 hour') then
      insert into security_incidents(reference, title, description, category, severity, source,
                                     related_user_id, related_institution_id, related_patient_id)
      values (app.short_ref('INC'), 'Repeated denied access attempts',
              format('%s denied attempts to access protected information within 10 minutes. Latest denial reason: %s.',
                     v_recent_denials, coalesce(p_denial_reason, 'unspecified')),
              'repeated_denials', 'high', 'automated', app.uid(), p_institution, p_patient);
      perform app.notify_platform_role('security_officer', 'security_incident', 'Automated security alert',
              'Repeated denied access attempts were detected and an incident was opened.', '/admin/security', 'critical');
    end if;
  end if;

  -- Rule 2: one professional touching an unusual number of patients in an hour.
  if p_outcome = 'allowed' and p_patient is not null and app.uid() is not null then
    v_threshold := app.setting_int('security.patients_per_hour_threshold', 25);
    select count(distinct patient_id) into v_distinct_patients from access_events
      where actor_user_id = app.uid() and outcome = 'allowed' and occurred_at > now() - interval '1 hour'
        and action in ('view_record','view_record_list','download_attachment');
    if v_distinct_patients > v_threshold and not exists (
        select 1 from security_incidents
        where related_user_id = app.uid() and category = 'suspicious_access' and created_at > now() - interval '1 hour') then
      insert into security_incidents(reference, title, description, category, severity, source,
                                     related_user_id, related_institution_id)
      values (app.short_ref('INC'), 'Unusual access volume',
              format('A professional accessed records for %s distinct patients within one hour.', v_distinct_patients),
              'suspicious_access', 'medium', 'automated', app.uid(), p_institution);
    end if;
  end if;

  return v_id;
end $$;
