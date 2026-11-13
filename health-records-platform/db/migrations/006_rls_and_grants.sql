-- ===========================================================================
-- 006 — Row Level Security & privileges
--
-- Principles
--   • Default deny: RLS is enabled on every table; no table is readable
--     unless a policy says so.
--   • Clinical tables (medical_records, attachments, versions) are readable
--     through RLS ONLY by the patient or their verified representative.
--     Providers read exclusively through app.provider_* functions, which
--     re-check authorization and log every attempt. Administrators have no
--     path to clinical content at all.
--   • Clients never INSERT/UPDATE/DELETE directly except a few
--     column-restricted, owner-scoped updates. All state changes go through
--     app.* functions.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema app from public, anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema app to authenticated, service_role;

-- service_role: trusted server code (auth module, background jobs).
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema app to service_role;

-- Helpers referenced from policies must be executable by the querying role.
grant execute on function
  app.claims(), app.uid(), app.request_ip(), app.current_user_active(), app.has_platform_role(text),
  app.is_platform_staff(), app.current_patient_id(), app.current_professional_id(), app.can_act_for_patient(uuid),
  app.is_administrative_capability(text), app.provider_denial_reason(uuid, text), app.has_capability(uuid, text),
  app.is_institution_member(uuid), app.record_institution(uuid), app.is_valid_health_id(text), app.mask_name(text),
  app.luhn_check_digit(text), app.setting(text), app.setting_int(text, integer), app.latest_consent_version(text)
to authenticated;

-- Workflow entry points. Each one authorises the caller itself.
grant execute on function
  app.patient_create_upload(uuid, text, text, date, text, text, text, text, text, integer, text, scan_status, text),
  app.decide_access_request(uuid, text, text[], uuid[], date, date, integer, boolean, text),
  app.revoke_permission(uuid, text),
  app.search_patients(uuid, text, text, date, text),
  app.create_access_request(uuid, uuid, access_purpose, text, text[], date, date, integer),
  app.cancel_access_request(uuid),
  app.provider_patient_overview(uuid, uuid),
  app.provider_list_records(uuid, uuid),
  app.provider_get_record(uuid, uuid),
  app.authorize_attachment(uuid, uuid),
  app.submit_clinical_record(uuid, uuid, text, text, text, date, jsonb, boolean, date, jsonb),
  app.emergency_access(uuid, uuid, text, text[]),
  app.raise_record_correction(uuid, correction_kind, text),
  app.patient_mark_upload_in_error(uuid, text),
  app.report_suspicious_activity(uuid, bigint, text),
  app.patient_activity(uuid, timestamptz, timestamptz, uuid, text, integer, integer),
  app.patient_request_detail(uuid),
  app.register_institution(jsonb),
  app.update_institution_draft(uuid, jsonb),
  app.add_institution_document(uuid, text, text, text, text, integer, text),
  app.submit_institution(uuid),
  app.invite_staff(uuid, citext, text, text, text),
  app.accept_staff_invitation(text, text, profession, text, text, date),
  app.set_affiliation_status(uuid, affiliation_status, text),
  app.provider_dashboard(uuid),
  app.institution_resolve_correction(uuid, correction_status, text),
  app.create_support_ticket(ticket_category, text, text, uuid, text),
  app.requester_comment_ticket(uuid, text),
  app.request_representation(text, date, representative_relationship, text),
  app.admin_set_institution_status(uuid, institution_status, text),
  app.admin_set_professional_status(uuid, professional_status, text),
  app.admin_set_user_status(uuid, user_status, text),
  app.admin_decide_identity(uuid, verification_status, text),
  app.admin_review_emergency(uuid, review_status, text),
  app.admin_overview(),
  app.admin_list_patients(text, integer, integer),
  app.admin_update_ticket(uuid, ticket_status, text, boolean, boolean),
  app.admin_update_incident(uuid, incident_status, text, boolean),
  app.admin_update_setting(text, jsonb),
  app.admin_set_representative_status(uuid, representative_status, text),
  app.verify_audit_chain()
to authenticated;

-- Read grants (row visibility is decided by the policies below).
grant select on
  users, roles, user_platform_roles, patients, patient_profiles, health_identifiers, patient_representatives,
  identity_verifications, healthcare_institutions, institution_documents, healthcare_professionals,
  professional_affiliations, staff_invitations, care_relationships, medical_record_categories,
  medical_records, medical_record_attachments, record_versions, record_corrections, consent_versions,
  access_requests, access_request_categories, permissions, permission_scopes, access_events, export_events,
  audit_logs, notifications, notification_preferences, support_tickets, support_ticket_events,
  security_incidents, platform_settings, policy_documents, integration_connections
to authenticated;
grant select on medical_record_categories, policy_documents, consent_versions to anon;

-- Narrow, column-restricted self-service writes.
grant update (read_at) on notifications to authenticated;
grant insert, update (in_app, email, updated_at) on notification_preferences to authenticated;
grant update (phone, address_line, state_of_residence, lga, preferred_language,
              emergency_contact_name, emergency_contact_phone, emergency_contact_relationship)
  on patient_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere (and force it for the table owner too).
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------
create policy users_self on users for select to authenticated using (id = app.uid());

create policy roles_read on roles for select to authenticated using (true);
create policy upr_read on user_platform_roles for select to authenticated
  using (user_id = app.uid() or app.is_platform_staff());

create policy patients_self on patients for select to authenticated using (app.can_act_for_patient(id));
create policy profiles_self on patient_profiles for select to authenticated using (app.can_act_for_patient(patient_id));
create policy profiles_self_update on patient_profiles for update to authenticated
  using (app.can_act_for_patient(patient_id)) with check (app.can_act_for_patient(patient_id));
create policy identifiers_self on health_identifiers for select to authenticated using (app.can_act_for_patient(patient_id));
create policy reps_read on patient_representatives for select to authenticated
  using (representative_user_id = app.uid() or app.can_act_for_patient(patient_id) or app.has_platform_role('platform_admin'));
create policy idv_read on identity_verifications for select to authenticated
  using (user_id = app.uid() or app.has_platform_role('platform_admin') or app.has_platform_role('support_agent'));

-- Approved and suspended institutions are visible to signed-in users so
-- patients can always see who is asking and their current standing.
create policy institutions_read on healthcare_institutions for select to authenticated
  using (status in ('approved','suspended') or created_by = app.uid() or app.is_institution_member(id) or app.is_platform_staff());
create policy inst_docs_read on institution_documents for select to authenticated
  using (uploaded_by = app.uid() or app.has_capability(institution_id, 'institution:manage') or app.has_platform_role('platform_admin'));

create policy professionals_read on healthcare_professionals for select to authenticated
  using (
    user_id = app.uid()
    or app.is_platform_staff()
    or exists (select 1 from professional_affiliations a
               where a.professional_id = healthcare_professionals.id and app.has_capability(a.institution_id, 'staff:manage'))
    or exists (select 1 from access_requests ar
               where ar.requested_by_professional_id = healthcare_professionals.id and app.can_act_for_patient(ar.patient_id))
    or exists (select 1 from permissions pm
               where pm.professional_id = healthcare_professionals.id and app.can_act_for_patient(pm.patient_id)));
create policy affiliations_read on professional_affiliations for select to authenticated
  using (
    professional_id = app.current_professional_id()
    or app.has_capability(institution_id, 'staff:manage')
    or app.is_platform_staff()
    or exists (select 1 from access_requests ar
               where ar.requested_by_professional_id = professional_affiliations.professional_id
                 and ar.institution_id = professional_affiliations.institution_id and app.can_act_for_patient(ar.patient_id)));
create policy invitations_read on staff_invitations for select to authenticated
  using (app.has_capability(institution_id, 'staff:manage'));
create policy care_rel_read on care_relationships for select to authenticated
  using (app.can_act_for_patient(patient_id) or app.is_institution_member(institution_id));

create policy categories_read on medical_record_categories for select to anon, authenticated using (true);

-- CLINICAL: patient / representative only.
create policy records_patient on medical_records for select to authenticated
  using (app.can_act_for_patient(patient_id));
create policy attachments_patient on medical_record_attachments for select to authenticated
  using (exists (select 1 from medical_records r where r.id = record_id));        -- inherits records_patient
create policy versions_patient on record_versions for select to authenticated
  using (exists (select 1 from medical_records r where r.id = record_id));        -- inherits records_patient
create policy corrections_read on record_corrections for select to authenticated
  using (app.can_act_for_patient(patient_id)
         or (app.record_institution(record_id) is not null and app.has_capability(app.record_institution(record_id), 'records:submit')));

create policy consent_read on consent_versions for select to anon, authenticated using (true);

create policy requests_read on access_requests for select to authenticated
  using (app.can_act_for_patient(patient_id) or app.is_institution_member(institution_id));
create policy request_cats_read on access_request_categories for select to authenticated
  using (exists (select 1 from access_requests ar where ar.id = request_id));
create policy permissions_read on permissions for select to authenticated
  using (app.can_act_for_patient(patient_id) or app.is_institution_member(institution_id) or app.has_platform_role('security_officer'));
create policy scopes_read on permission_scopes for select to authenticated
  using (exists (select 1 from permissions p where p.id = permission_id));

create policy access_events_read on access_events for select to authenticated
  using (app.can_act_for_patient(patient_id)
         or actor_user_id = app.uid()
         or (institution_id is not null and app.has_capability(institution_id, 'activity:view'))
         or app.has_platform_role('security_officer'));
create policy export_events_read on export_events for select to authenticated
  using (app.can_act_for_patient(patient_id)
         or (institution_id is not null and app.has_capability(institution_id, 'activity:view'))
         or app.has_platform_role('security_officer'));
create policy audit_read on audit_logs for select to authenticated
  using (app.has_platform_role('security_officer') or app.has_platform_role('platform_admin')
         or (institution_id is not null and app.has_capability(institution_id, 'activity:view')));

create policy notifications_own on notifications for select to authenticated using (user_id = app.uid());
create policy notifications_mark_read on notifications for update to authenticated
  using (user_id = app.uid()) with check (user_id = app.uid());
create policy prefs_own_read on notification_preferences for select to authenticated using (user_id = app.uid());
create policy prefs_own_insert on notification_preferences for insert to authenticated with check (user_id = app.uid());
create policy prefs_own_update on notification_preferences for update to authenticated
  using (user_id = app.uid()) with check (user_id = app.uid());

create policy tickets_read on support_tickets for select to authenticated
  using (requester_user_id = app.uid() or app.has_platform_role('support_agent') or app.has_platform_role('platform_admin'));
create policy ticket_events_read on support_ticket_events for select to authenticated
  using (exists (select 1 from support_tickets t where t.id = ticket_id)
         and (visible_to_requester or app.has_platform_role('support_agent') or app.has_platform_role('platform_admin')));

create policy incidents_read on security_incidents for select to authenticated
  using (app.has_platform_role('security_officer') or app.has_platform_role('platform_admin') or reported_by = app.uid());

create policy settings_read on platform_settings for select to authenticated using (true);
create policy policies_read on policy_documents for select to anon, authenticated using (true);
create policy integrations_read on integration_connections for select to authenticated
  using (app.has_capability(institution_id, 'integrations:manage') or app.has_platform_role('platform_admin'));

-- Tables with NO authenticated policy (service_role only):
--   auth_sessions, auth_tokens, known_devices, rate_limit_buckets, message_outbox
