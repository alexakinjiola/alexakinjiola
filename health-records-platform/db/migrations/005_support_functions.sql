-- ===========================================================================
-- 005 — Support, incidents, settings, representatives
-- ===========================================================================

create or replace function app.create_support_ticket(
  p_category ticket_category, p_subject text, p_description text, p_institution uuid default null,
  p_related_entity text default null)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_ref text := app.short_ref('SUP');
  v_id uuid;
  v_type text;
  v_patient uuid := app.current_patient_id();
  v_open integer;
begin
  if not app.current_user_active() then perform app.fail('NP403', 'Sign in to contact support.'); end if;
  if p_institution is not null and not app.is_institution_member(p_institution) then
    perform app.fail('NP403', 'You are not a member of this institution.');
  end if;
  select count(*) into v_open from support_tickets where requester_user_id = app.uid() and created_at > now() - interval '1 hour';
  if v_open >= 10 then perform app.fail('NP409', 'You have opened several requests recently. Please wait before opening another.'); end if;

  v_type := case when p_institution is not null then 'institution'
                 when v_patient is not null then 'patient' else 'professional' end;
  insert into support_tickets(reference, requester_user_id, requester_type, institution_id, patient_id, category, subject,
                              description, related_entity,
                              priority)
  values (v_ref, app.uid(), v_type, p_institution, case when v_type = 'patient' then v_patient end, p_category,
          trim(p_subject), trim(p_description), p_related_entity,
          case when p_category in ('suspicious_activity','account_access') then 'high' else 'normal' end::ticket_priority)
  returning id into v_id;
  insert into support_ticket_events(ticket_id, actor_user_id, event_type, to_status) values (v_id, app.uid(), 'created', 'open');
  perform app.audit('support.ticket_created', 'support_ticket', v_ref, case when v_type = 'patient' then v_patient end,
                    p_institution, jsonb_build_object('category', p_category));
  perform app.notify_platform_role('support_agent', 'support', 'New support request', format('%s: %s', v_ref, p_category),
                                   '/admin/support', 'info');
  return v_ref;
end $$;

create or replace function app.admin_update_ticket(
  p_ticket uuid, p_status ticket_status, p_note text, p_visible_to_requester boolean default true,
  p_assign_to_me boolean default false)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_t support_tickets%rowtype;
begin
  if not (app.has_platform_role('support_agent') or app.has_platform_role('platform_admin')) then
    perform app.fail('NP403', 'Support staff only.');
  end if;
  select * into v_t from support_tickets where id = p_ticket for update;
  if not found then perform app.fail('NP404', 'Ticket not found.'); end if;
  update support_tickets set status = p_status,
         assigned_to = case when p_assign_to_me then app.uid() else assigned_to end,
         resolved_at = case when p_status in ('resolved','closed') then coalesce(resolved_at, now()) else null end
   where id = p_ticket;
  if p_status <> v_t.status then
    insert into support_ticket_events(ticket_id, actor_user_id, event_type, from_status, to_status, note, visible_to_requester)
    values (p_ticket, app.uid(), 'status_changed', v_t.status, p_status, nullif(trim(p_note), ''), p_visible_to_requester);
  elsif nullif(trim(p_note), '') is not null then
    insert into support_ticket_events(ticket_id, actor_user_id, event_type, note, visible_to_requester)
    values (p_ticket, app.uid(), 'comment', trim(p_note), p_visible_to_requester);
  end if;
  perform app.audit('admin.ticket_updated', 'support_ticket', v_t.reference, v_t.patient_id, v_t.institution_id,
                    jsonb_build_object('from', v_t.status, 'to', p_status));
  if p_visible_to_requester then
    perform app.notify(v_t.requester_user_id, 'support', format('Update on %s', v_t.reference),
            format('Your support request is now %s.', replace(p_status::text, '_', ' ')), '/support', 'info');
  end if;
end $$;

create or replace function app.requester_comment_ticket(p_ticket uuid, p_note text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_t support_tickets%rowtype;
begin
  select * into v_t from support_tickets where id = p_ticket and requester_user_id = app.uid() for update;
  if not found then perform app.fail('NP404', 'Ticket not found.'); end if;
  if char_length(coalesce(trim(p_note), '')) < 2 then perform app.fail('NP400', 'Write a message.'); end if;
  insert into support_ticket_events(ticket_id, actor_user_id, event_type, note) values (p_ticket, app.uid(), 'comment', trim(p_note));
  if v_t.status = 'awaiting_requester' then
    update support_tickets set status = 'in_progress' where id = p_ticket;
  end if;
end $$;

create or replace function app.admin_update_incident(p_incident uuid, p_status incident_status, p_note text, p_assign_to_me boolean default false)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_i security_incidents%rowtype;
begin
  if not app.has_platform_role('security_officer') then perform app.fail('NP403', 'Security officers only.'); end if;
  select * into v_i from security_incidents where id = p_incident for update;
  if not found then perform app.fail('NP404', 'Incident not found.'); end if;
  if p_status in ('resolved','dismissed') and char_length(coalesce(trim(p_note), '')) < 10 then
    perform app.fail('NP400', 'Record a resolution note of at least 10 characters.');
  end if;
  update security_incidents set status = p_status,
         resolution_note = coalesce(nullif(trim(p_note), ''), resolution_note),
         assigned_to = case when p_assign_to_me then app.uid() else assigned_to end,
         resolved_at = case when p_status in ('resolved','dismissed') then now() else null end
   where id = p_incident;
  perform app.audit('admin.incident_updated', 'security_incident', v_i.reference, v_i.related_patient_id, v_i.related_institution_id,
                    jsonb_build_object('from', v_i.status, 'to', p_status));
  if v_i.reported_by is not null and p_status in ('resolved','dismissed') then
    perform app.notify(v_i.reported_by, 'security', format('Your report %s was reviewed', v_i.reference),
            'Our security team finished reviewing your report. Contact support if you have further concerns.', '/activity', 'info', true);
  end if;
end $$;

create or replace function app.admin_update_setting(p_key text, p_value jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_old jsonb;
begin
  if not app.has_platform_role('platform_admin') then perform app.fail('NP403', 'Platform administrators only.'); end if;
  select value into v_old from platform_settings where key = p_key for update;
  if not found then perform app.fail('NP404', 'Unknown setting.'); end if;
  if jsonb_typeof(p_value) <> jsonb_typeof(v_old) then perform app.fail('NP400', 'The new value has the wrong type.'); end if;
  update platform_settings set value = p_value, updated_by = app.uid(), updated_at = now() where key = p_key;
  perform app.audit('admin.setting_changed', 'platform_setting', p_key, null, null,
                    jsonb_build_object('from', v_old, 'to', p_value));
end $$;

-- A patient (or a parent for a minor) asks for a representative relationship.
-- It stays pending until platform staff verify the legal documentation.
create or replace function app.request_representation(
  p_patient_health_id text, p_patient_dob date, p_relationship representative_relationship, p_note text)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_patient uuid; v_ref text;
begin
  if not app.current_user_active() then perform app.fail('NP403', 'Sign in first.'); end if;
  select h.patient_id into v_patient from health_identifiers h join patient_profiles pp on pp.patient_id = h.patient_id
   where h.identifier_type = 'platform_hid' and h.value = upper(p_patient_health_id) and pp.date_of_birth = p_patient_dob;
  if v_patient is null then perform app.fail('NP404', 'No patient matches that Health ID and date of birth.'); end if;
  if exists (select 1 from patients where id = v_patient and user_id = app.uid()) then
    perform app.fail('NP409', 'You cannot be your own representative.');
  end if;
  insert into patient_representatives(patient_id, representative_user_id, relationship, legal_basis_note)
  values (v_patient, app.uid(), p_relationship, nullif(trim(p_note), ''))
  on conflict (patient_id, representative_user_id) do nothing;
  v_ref := app.create_support_ticket('identity_reconciliation', 'Representative verification',
           format('Request to act as %s for a patient. Supporting legal documents must be verified before activation.', p_relationship));
  perform app.audit('representative.requested', 'patient', v_patient::text, v_patient, null, jsonb_build_object('relationship', p_relationship));
  return v_ref;
end $$;

create or replace function app.admin_set_representative_status(p_rep uuid, p_status representative_status, p_note text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_r patient_representatives%rowtype;
begin
  if not app.has_platform_role('platform_admin') then perform app.fail('NP403', 'Platform administrators only.'); end if;
  if char_length(coalesce(trim(p_note), '')) < 10 then perform app.fail('NP400', 'Record the evidence reviewed (10+ characters).'); end if;
  select * into v_r from patient_representatives where id = p_rep for update;
  if not found then perform app.fail('NP404', 'Not found.'); end if;
  update patient_representatives set status = p_status, legal_basis_note = coalesce(legal_basis_note || E'\n', '') || trim(p_note),
         verified_by = app.uid(), verified_at = now() where id = p_rep;
  perform app.audit('admin.representative_status', 'patient_representative', p_rep::text, v_r.patient_id, null,
                    jsonb_build_object('to', p_status));
  perform app.notify_patient(v_r.patient_id, 'security', 'Representative access changed',
          format('A representative relationship on your account is now %s.', replace(p_status::text, '_', ' ')), '/settings', 'warning', true);
  perform app.notify(v_r.representative_user_id, 'security', 'Representative request updated',
          format('Your representative request is now %s.', replace(p_status::text, '_', ' ')), '/dashboard', 'info', true);
end $$;

-- Patient-facing view of one access request with the institution and
-- requester context they need to make an informed decision.
create or replace function app.patient_request_detail(p_request uuid) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v jsonb; v_patient uuid;
begin
  select patient_id into v_patient from access_requests where id = p_request;
  if v_patient is null or not app.can_act_for_patient(v_patient) then perform app.fail('NP404', 'Request not found.'); end if;
  select jsonb_build_object(
    'id', ar.id, 'reference', ar.reference, 'status', ar.status, 'purpose', ar.purpose, 'purpose_detail', ar.purpose_detail,
    'date_from', ar.date_from, 'date_to', ar.date_to, 'duration_days', ar.requested_duration_days,
    'created_at', ar.created_at, 'respond_by', ar.respond_by, 'decided_at', ar.decided_at, 'patient_id', ar.patient_id,
    'categories', (select jsonb_agg(category_key order by category_key) from access_request_categories where request_id = ar.id),
    'institution', jsonb_build_object('id', i.id, 'name', i.name, 'type', i.institution_type, 'status', i.status,
                                      'city', i.city, 'state', i.state, 'verified_at', i.reviewed_at),
    'professional', jsonb_build_object('name', hp.full_name, 'profession', hp.profession, 'verification', hp.verification_status,
                                       'license_body', hp.license_body,
                                       'role', (select r.name from professional_affiliations a join roles r on r.id = a.role_id
                                                where a.professional_id = hp.id and a.institution_id = i.id
                                                order by a.created_at desc limit 1)),
    'matching_records', (select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'category_key', r.category_key,
                                  'clinical_date', r.clinical_date, 'source', r.source) order by r.clinical_date desc nulls last)
                         from medical_records r
                         where r.patient_id = ar.patient_id and r.status in ('available','under_review')
                           and r.category_key in (select category_key from access_request_categories where request_id = ar.id)
                           and (ar.date_from is null or coalesce(r.clinical_date, r.created_at::date) >= ar.date_from)
                           and (ar.date_to is null or coalesce(r.clinical_date, r.created_at::date) <= ar.date_to)),
    'previous_requests', (select count(*) from access_requests x where x.patient_id = ar.patient_id
                          and x.institution_id = ar.institution_id and x.id <> ar.id))
  into v
  from access_requests ar
  join healthcare_institutions i on i.id = ar.institution_id
  join healthcare_professionals hp on hp.id = ar.requested_by_professional_id
  where ar.id = p_request;
  return v;
end $$;

-- Provider dashboard aggregates (institution-scoped, no clinical content).
create or replace function app.provider_dashboard(p_institution uuid) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.is_institution_member(p_institution) then perform app.fail('NP403', 'Not a member of this institution.'); end if;
  return jsonb_build_object(
    'records_submitted', (select count(*) from medical_records where institution_id = p_institution),
    'records_30d', (select count(*) from medical_records where institution_id = p_institution and created_at > now() - interval '30 days'),
    'pending', (select count(*) from access_requests where institution_id = p_institution and status = 'pending' and respond_by > now()),
    'approved', (select count(*) from access_requests where institution_id = p_institution and status in ('approved','partially_approved')),
    'rejected', (select count(*) from access_requests where institution_id = p_institution and status = 'rejected'),
    'expired_requests', (select count(*) from access_requests where institution_id = p_institution and status = 'expired'),
    'active_permissions', (select count(*) from permissions where institution_id = p_institution and status = 'active' and expires_at > now()),
    'expiring_soon', (select count(*) from permissions where institution_id = p_institution and status = 'active'
                       and expires_at > now() and expires_at <= now() + interval '72 hours'),
    'active_staff', (select count(*) from professional_affiliations where institution_id = p_institution and status = 'active'),
    'open_corrections', (select count(*) from record_corrections c join medical_records r on r.id = c.record_id
                          where r.institution_id = p_institution and c.status in ('open','under_review')),
    'submissions_weekly', (select coalesce(jsonb_agg(jsonb_build_object('week', w::date, 'count', n) order by w), '[]') from (
        select g.w, count(r.id) n
        from generate_series(date_trunc('week', now()) - interval '7 weeks', date_trunc('week', now()), interval '1 week') g(w)
        left join medical_records r on r.institution_id = p_institution and date_trunc('week', r.created_at) = g.w
        group by g.w) x)
  );
end $$;

create or replace function app.record_institution(p_record uuid) returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select institution_id from medical_records where id = p_record
$$;

create or replace function app.institution_resolve_correction(p_correction uuid, p_status correction_status, p_note text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_c record_corrections%rowtype; v_inst uuid;
begin
  select * into v_c from record_corrections where id = p_correction for update;
  if not found then perform app.fail('NP404', 'Not found.'); end if;
  v_inst := app.record_institution(v_c.record_id);
  if v_inst is null or not app.has_capability(v_inst, 'records:submit') then perform app.fail('NP403', 'Not permitted.'); end if;
  if char_length(coalesce(trim(p_note), '')) < 10 then perform app.fail('NP400', 'Explain the outcome (10+ characters).'); end if;
  update record_corrections set status = p_status, resolution_note = trim(p_note), resolved_by = app.uid(),
         resolved_at = case when p_status in ('resolved','rejected') then now() end where id = p_correction;
  perform app.audit('record.correction_' || p_status, 'medical_record', v_c.record_id::text, v_c.patient_id, v_inst, '{}');
  perform app.notify_patient(v_c.patient_id, 'record_correction', 'Update on your record query',
          format('The institution marked your query as %s.', replace(p_status::text, '_', ' ')), '/records/' || v_c.record_id, 'info');
end $$;
