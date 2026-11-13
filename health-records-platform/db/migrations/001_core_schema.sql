-- ===========================================================================
-- 001 — Core schema
-- Normalized model for patients, institutions, professionals, records,
-- access requests, permissions, audit and support.
-- Naming: snake_case, plural tables, uuid primary keys (bigint for logs).
-- ===========================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists app;
revoke all on schema app from public;

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
create type user_status            as enum ('active','locked','suspended','closed');
create type verification_status    as enum ('unverified','pending','verified','under_review','failed');
create type patient_status         as enum ('active','restricted','deceased','closed');
create type sex_at_birth           as enum ('female','male','intersex','undisclosed');
create type identifier_type        as enum ('platform_hid','nin','hospital_mrn','insurance');
create type institution_type       as enum ('hospital','clinic','laboratory','diagnostic_centre','primary_health_centre','pharmacy');
create type institution_status     as enum ('draft','submitted','under_review','approved','rejected','suspended');
create type profession             as enum ('medical_doctor','dentist','nurse_midwife','pharmacist','medical_lab_scientist','radiographer','health_records_officer','administrator','other');
create type professional_status    as enum ('unverified','pending','verified','rejected','suspended');
create type affiliation_status     as enum ('active','suspended','revoked','ended');
create type invitation_status      as enum ('pending','accepted','expired','cancelled');
create type record_source          as enum ('patient_upload','institution_submission','integration','administrative_migration');
create type record_verification    as enum ('patient_provided','institution_verified','integration_verified','under_review');
create type record_status          as enum ('pending_processing','available','under_review','superseded','restricted','entered_in_error');
create type scan_status            as enum ('pending','clean','rejected','failed');
create type access_purpose         as enum ('ongoing_care','referral','specialist_consultation','diagnostic_review','second_opinion','follow_up','emergency_care','other');
create type request_status         as enum ('pending','approved','partially_approved','rejected','expired','cancelled');
create type permission_status      as enum ('active','expired','revoked','suspended');
create type authorization_basis    as enum ('patient_consent','representative_consent','emergency_access','legal_obligation');
create type review_status          as enum ('not_required','pending_review','appropriate','inappropriate');
create type access_action          as enum ('search_patient','view_patient_summary','view_record_list','view_record','download_attachment','submit_record','emergency_access','export');
create type access_outcome         as enum ('allowed','denied');
create type notification_severity  as enum ('info','success','warning','critical');
create type delivery_status        as enum ('not_required','queued','sent','failed');
create type ticket_status          as enum ('open','in_progress','awaiting_requester','resolved','closed');
create type ticket_category        as enum ('account_access','identity_verification','identity_reconciliation','duplicate_account','profile_correction','record_correction','suspicious_activity','data_subject_request','account_closure','institution_verification','technical','other');
create type ticket_priority        as enum ('low','normal','high','urgent');
create type incident_status        as enum ('open','investigating','contained','resolved','dismissed');
create type incident_severity      as enum ('low','medium','high','critical');
create type representative_relationship as enum ('parent','legal_guardian','court_appointed_representative','power_of_attorney');
create type representative_status  as enum ('pending_verification','active','revoked','expired');
create type correction_kind        as enum ('flag_error','correction_request','dispute');
create type correction_status      as enum ('open','under_review','resolved','rejected');
create type integration_status     as enum ('pending','active','paused','revoked');
create type token_purpose          as enum ('email_verification','phone_verification','password_reset','step_up');
create type role_scope             as enum ('platform','institution');

-- ---------------------------------------------------------------------------
-- Shared trigger: maintain updated_at
-- ---------------------------------------------------------------------------
create or replace function app.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 1. users — one login identity. Personas (patient / professional / platform
--    staff) hang off this row.
-- ---------------------------------------------------------------------------
create table users (
  id                 uuid primary key default gen_random_uuid(),
  email              citext not null unique,
  phone              text unique check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  display_name       text not null check (char_length(display_name) between 2 and 120),
  password_hash      text not null,
  status             user_status not null default 'active',
  email_verified_at  timestamptz,
  phone_verified_at  timestamptz,
  mfa_enabled        boolean not null default false,
  mfa_secret_enc     text,                         -- AES-GCM encrypted TOTP secret
  mfa_enrolled_at    timestamptz,
  failed_login_count integer not null default 0,
  locked_until       timestamptz,
  last_login_at      timestamptz,
  password_changed_at timestamptz not null default now(),
  is_synthetic       boolean not null default false, -- demo/seed data marker
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (not mfa_enabled or mfa_secret_enc is not null)
);
create trigger users_touch before update on users for each row execute function app.touch_updated_at();

create table auth_sessions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  token_hash          text not null unique,
  mfa_verified        boolean not null default false,
  reauthenticated_at  timestamptz,
  ip_address          inet,
  user_agent          text,
  device_label        text,
  created_at          timestamptz not null default now(),
  last_seen_at        timestamptz not null default now(),
  idle_expires_at     timestamptz not null,
  absolute_expires_at timestamptz not null,
  revoked_at          timestamptz,
  revoked_reason      text
);
create index auth_sessions_user_idx on auth_sessions(user_id) where revoked_at is null;

create table auth_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  purpose      token_purpose not null,
  token_hash   text not null unique,
  attempts     integer not null default 0,
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index auth_tokens_user_purpose_idx on auth_tokens(user_id, purpose) where consumed_at is null;

create table known_devices (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  device_hash   text not null,
  label         text,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  unique (user_id, device_hash)
);

-- Generic fixed-window rate limiter (login attempts per IP, searches per user …)
create table rate_limit_buckets (
  bucket_key   text not null,
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (bucket_key, window_start)
);

-- ---------------------------------------------------------------------------
-- Roles & capabilities (data-driven RBAC)
-- ---------------------------------------------------------------------------
create table roles (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique check (key ~ '^[a-z_]+$'),
  scope        role_scope not null,
  name         text not null,
  description  text not null,
  capabilities text[] not null default '{}',
  created_at   timestamptz not null default now()
);

create table user_platform_roles (
  user_id    uuid not null references users(id) on delete cascade,
  role_id    uuid not null references roles(id),
  granted_by uuid references users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

-- ---------------------------------------------------------------------------
-- Patients
-- ---------------------------------------------------------------------------
create table patients (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid unique references users(id) on delete restrict, -- null for minors managed by a representative
  status              patient_status not null default 'active',
  verification_status verification_status not null default 'unverified',
  verified_at         timestamptz,
  deceased_at         date,
  is_synthetic        boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger patients_touch before update on patients for each row execute function app.touch_updated_at();

create table patient_profiles (
  patient_id               uuid primary key references patients(id) on delete cascade,
  full_name                text not null check (char_length(full_name) between 2 and 160),
  date_of_birth            date not null check (date_of_birth > '1900-01-01' and date_of_birth <= current_date),
  sex                      sex_at_birth not null default 'undisclosed',
  phone                    text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  address_line             text,
  state_of_residence       text,
  lga                      text,
  preferred_language       text not null default 'en',
  emergency_contact_name   text,
  emergency_contact_phone  text check (emergency_contact_phone is null or emergency_contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  emergency_contact_relationship text,
  updated_at               timestamptz not null default now()
);
create trigger patient_profiles_touch before update on patient_profiles for each row execute function app.touch_updated_at();
create index patient_profiles_dob_idx on patient_profiles(date_of_birth);

create table health_identifiers (
  id                    uuid primary key default gen_random_uuid(),
  patient_id            uuid not null references patients(id) on delete cascade,
  identifier_type       identifier_type not null,
  -- For platform_hid the value is stored as-is. For NIN we store ONLY a keyed
  -- hash (value_hash) and the last four digits (display_hint), never the number.
  value                 text,
  value_hash            text,
  display_hint          text,
  issuer_institution_id uuid,
  is_primary            boolean not null default false,
  created_at            timestamptz not null default now(),
  check (value is not null or value_hash is not null),
  check (identifier_type <> 'nin' or (value is null and value_hash is not null))
);
create unique index health_identifiers_value_uq on health_identifiers(identifier_type, value) where value is not null;
create unique index health_identifiers_hash_uq on health_identifiers(identifier_type, value_hash) where value_hash is not null;
create unique index health_identifiers_primary_uq on health_identifiers(patient_id) where is_primary;

create table patient_representatives (
  id                     uuid primary key default gen_random_uuid(),
  patient_id             uuid not null references patients(id) on delete cascade,
  representative_user_id uuid not null references users(id) on delete cascade,
  relationship           representative_relationship not null,
  status                 representative_status not null default 'pending_verification',
  legal_basis_note       text,
  valid_from             timestamptz not null default now(),
  valid_until            timestamptz,
  verified_by            uuid references users(id),
  verified_at            timestamptz,
  created_at             timestamptz not null default now(),
  unique (patient_id, representative_user_id)
);

create table identity_verifications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  patient_id     uuid references patients(id) on delete cascade,
  provider       text not null,                 -- 'sandbox', 'manual_review', 'nimc' …
  method         text not null,                 -- 'nin', 'in_person', 'document'
  status         verification_status not null default 'pending',
  provider_reference text,
  failure_reason text,
  submitted_at   timestamptz not null default now(),
  decided_at     timestamptz,
  decided_by     uuid references users(id)
);
create index identity_verifications_user_idx on identity_verifications(user_id, submitted_at desc);

-- ---------------------------------------------------------------------------
-- Institutions & professionals
-- ---------------------------------------------------------------------------
create table healthcare_institutions (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null check (char_length(name) between 3 and 200),
  institution_type      institution_type not null,
  registration_number   text unique,           -- CAC / facility registration
  license_number        text,
  license_authority     text,                  -- e.g. state Ministry of Health, HEFAMAA
  license_expires_on    date,
  address_line          text,
  city                  text,
  state                 text,
  lga                   text,
  email                 citext,
  phone                 text,
  website               text,
  representative_name   text,
  representative_title  text,
  representative_email  citext,
  representative_phone  text,
  status                institution_status not null default 'draft',
  status_reason         text,
  submitted_at          timestamptz,
  reviewed_at           timestamptz,
  reviewed_by           uuid references users(id),
  created_by            uuid not null references users(id),
  is_synthetic          boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger institutions_touch before update on healthcare_institutions for each row execute function app.touch_updated_at();
create index institutions_status_idx on healthcare_institutions(status);
alter table health_identifiers add constraint health_identifiers_issuer_fk
  foreign key (issuer_institution_id) references healthcare_institutions(id);

create table institution_documents (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references healthcare_institutions(id) on delete cascade,
  document_type  text not null check (document_type in ('operating_license','cac_certificate','representative_id','accreditation','other')),
  storage_key    text not null unique,
  file_name      text not null,
  mime_type      text not null check (mime_type in ('application/pdf','image/jpeg','image/png')),
  size_bytes     integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  sha256         text not null,
  uploaded_by    uuid not null references users(id),
  created_at     timestamptz not null default now()
);

create table healthcare_professionals (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references users(id) on delete restrict,
  full_name           text not null,
  profession          profession not null,
  license_body        text,       -- MDCN, NMCN, PCN, MLSCN, RRBN, HRORBN
  license_number      text,
  license_expires_on  date,
  verification_status professional_status not null default 'unverified',
  verified_at         timestamptz,
  verified_by         uuid references users(id),
  status_reason       text,
  is_synthetic        boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (license_body, license_number)
);
create trigger professionals_touch before update on healthcare_professionals for each row execute function app.touch_updated_at();

create table professional_affiliations (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references healthcare_professionals(id) on delete cascade,
  institution_id  uuid not null references healthcare_institutions(id) on delete cascade,
  role_id         uuid not null references roles(id),
  status          affiliation_status not null default 'active',
  department      text,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  end_reason      text,
  created_by      uuid references users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger affiliations_touch before update on professional_affiliations for each row execute function app.touch_updated_at();
create unique index affiliations_one_live_uq on professional_affiliations(professional_id, institution_id) where status in ('active','suspended');
create index affiliations_institution_idx on professional_affiliations(institution_id, status);

create table staff_invitations (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references healthcare_institutions(id) on delete cascade,
  email          citext not null,
  full_name      text not null,
  role_id        uuid not null references roles(id),
  token_hash     text not null unique,
  status         invitation_status not null default 'pending',
  invited_by     uuid not null references users(id),
  expires_at     timestamptz not null,
  accepted_at    timestamptz,
  accepted_user_id uuid references users(id),
  created_at     timestamptz not null default now()
);
create unique index staff_invitations_pending_uq on staff_invitations(institution_id, email) where status = 'pending';

-- A care relationship is the "patient association" an institution needs before
-- it may SUBMIT records. It never grants READ access on its own.
create table care_relationships (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references patients(id) on delete cascade,
  institution_id  uuid not null references healthcare_institutions(id) on delete cascade,
  established_via text not null check (established_via in ('attested_encounter','access_permission','integration')),
  encounter_date  date,
  attested_by     uuid references healthcare_professionals(id),
  created_at      timestamptz not null default now(),
  unique (patient_id, institution_id)
);

-- ---------------------------------------------------------------------------
-- Medical records
-- ---------------------------------------------------------------------------
create table medical_record_categories (
  key         text primary key check (key ~ '^[a-z_]+$'),
  label       text not null,
  description text not null,
  sort_order  smallint not null,
  timeline    boolean not null default true
);

create table integration_connections (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references healthcare_institutions(id) on delete cascade,
  name           text not null,
  system_type    text not null check (system_type in ('hms','emr','lims','ris_pacs','other')),
  standard       text not null check (standard in ('fhir_r4','hl7v2','custom_json')),
  status         integration_status not null default 'pending',
  api_key_prefix text unique,
  api_key_hash   text unique,
  last_used_at   timestamptz,
  created_by     uuid not null references users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger integrations_touch before update on integration_connections for each row execute function app.touch_updated_at();

create table medical_records (
  id                      uuid primary key default gen_random_uuid(),
  patient_id              uuid not null references patients(id) on delete restrict,
  category_key            text not null references medical_record_categories(key),
  title                   text not null check (char_length(title) between 3 and 200),
  description             text check (char_length(description) <= 4000),
  clinical_date           date check (clinical_date <= current_date + 1),
  source                  record_source not null,
  verification_status     record_verification not null,
  status                  record_status not null default 'available',
  institution_id          uuid references healthcare_institutions(id),
  originating_facility    text,              -- free text for patient uploads (unverified)
  attending_professional  text,              -- display name captured at submission
  professional_id         uuid references healthcare_professionals(id),
  integration_connection_id uuid references integration_connections(id),
  source_system_ref       text,
  submitted_by_user_id    uuid not null references users(id),
  structured_data         jsonb,
  current_version         integer not null default 1,
  duplicate_of            uuid references medical_records(id),
  is_synthetic            boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  -- Provenance invariants: a patient upload can never claim verification,
  -- and an institutional submission must name the institution and professional.
  constraint records_patient_upload_unverified check (
    source <> 'patient_upload' or (verification_status = 'patient_provided' and institution_id is null and professional_id is null)),
  constraint records_institution_provenance check (
    source <> 'institution_submission' or (institution_id is not null and professional_id is not null and verification_status in ('institution_verified','under_review'))),
  constraint records_integration_provenance check (
    source <> 'integration' or (institution_id is not null and integration_connection_id is not null))
);
create trigger records_touch before update on medical_records for each row execute function app.touch_updated_at();
create index records_patient_date_idx on medical_records(patient_id, clinical_date desc nulls last);
create index records_patient_category_idx on medical_records(patient_id, category_key);
create index records_institution_idx on medical_records(institution_id, created_at desc);
create unique index records_source_ref_uq on medical_records(institution_id, source_system_ref) where source_system_ref is not null;

create table medical_record_attachments (
  id           uuid primary key default gen_random_uuid(),
  record_id    uuid not null references medical_records(id) on delete restrict,
  storage_key  text not null unique,
  file_name    text not null check (char_length(file_name) <= 255),
  mime_type    text not null check (mime_type in ('application/pdf','image/jpeg','image/png')),
  size_bytes   integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  sha256       text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  scan_status  scan_status not null default 'pending',
  scan_detail  text,
  scanned_at   timestamptz,
  encryption   text not null default 'aes-256-gcm',
  uploaded_by  uuid not null references users(id),
  created_at   timestamptz not null default now()
);
create index attachments_record_idx on medical_record_attachments(record_id);
create index attachments_sha_idx on medical_record_attachments(sha256);

create table record_versions (
  id            uuid primary key default gen_random_uuid(),
  record_id     uuid not null references medical_records(id) on delete restrict,
  version       integer not null,
  change_type   text not null check (change_type in ('created','amended','status_changed','superseded','correction_applied')),
  change_reason text,
  snapshot      jsonb not null,
  changed_by    uuid not null references users(id),
  created_at    timestamptz not null default now(),
  unique (record_id, version)
);

create table record_corrections (
  id            uuid primary key default gen_random_uuid(),
  record_id     uuid not null references medical_records(id) on delete restrict,
  patient_id    uuid not null references patients(id),
  kind          correction_kind not null,
  details       text not null check (char_length(details) between 10 and 4000),
  status        correction_status not null default 'open',
  resolution_note text,
  raised_by     uuid not null references users(id),
  resolved_by   uuid references users(id),
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);
create index record_corrections_record_idx on record_corrections(record_id);

-- ---------------------------------------------------------------------------
-- Consent, access requests, permissions
-- ---------------------------------------------------------------------------
create table consent_versions (
  id             uuid primary key default gen_random_uuid(),
  key            text not null,
  version        integer not null,
  title          text not null,
  body           text not null,
  effective_from timestamptz not null default now(),
  retired_at     timestamptz,
  created_at     timestamptz not null default now(),
  unique (key, version)
);

create table access_requests (
  id                         uuid primary key default gen_random_uuid(),
  reference                  text not null unique,
  patient_id                 uuid not null references patients(id) on delete cascade,
  institution_id             uuid not null references healthcare_institutions(id),
  requested_by_professional_id uuid not null references healthcare_professionals(id),
  requested_by_user_id       uuid not null references users(id),
  purpose                    access_purpose not null check (purpose <> 'emergency_care'),
  purpose_detail             text not null check (char_length(purpose_detail) between 10 and 1000),
  date_from                  date,
  date_to                    date,
  requested_duration_days    integer not null check (requested_duration_days between 1 and 365),
  status                     request_status not null default 'pending',
  respond_by                 timestamptz not null,
  decided_at                 timestamptz,
  decided_by_user_id         uuid references users(id),
  decision_note              text,
  created_at                 timestamptz not null default now(),
  check (date_from is null or date_to is null or date_from <= date_to)
);
create index access_requests_patient_idx on access_requests(patient_id, status, created_at desc);
create index access_requests_institution_idx on access_requests(institution_id, status, created_at desc);

create table access_request_categories (
  request_id   uuid not null references access_requests(id) on delete cascade,
  category_key text not null references medical_record_categories(key),
  primary key (request_id, category_key)
);

create table permissions (
  id                   uuid primary key default gen_random_uuid(),
  reference            text not null unique,
  patient_id           uuid not null references patients(id) on delete cascade,
  institution_id       uuid not null references healthcare_institutions(id),
  access_request_id    uuid unique references access_requests(id),
  professional_id      uuid references healthcare_professionals(id), -- null = authorised staff group of the institution
  purpose              access_purpose not null,
  purpose_detail       text not null,
  authorization_basis  authorization_basis not null,
  consent_version_id   uuid references consent_versions(id),
  justification        text,          -- mandatory for emergency / legal-obligation bases
  date_from            date,
  date_to              date,
  granted_by_user_id   uuid not null references users(id),
  granted_at           timestamptz not null default now(),
  valid_from           timestamptz not null default now(),
  expires_at           timestamptz not null,
  status               permission_status not null default 'active',
  revoked_at           timestamptz,
  revoked_by_user_id   uuid references users(id),
  revocation_reason    text,
  review_status        review_status not null default 'not_required',
  reviewed_by          uuid references users(id),
  reviewed_at          timestamptz,
  review_note          text,
  created_at           timestamptz not null default now(),
  check (expires_at > valid_from),
  check (authorization_basis not in ('patient_consent','representative_consent') or consent_version_id is not null),
  check (authorization_basis not in ('emergency_access','legal_obligation') or char_length(coalesce(justification,'')) >= 20),
  check (status <> 'revoked' or revoked_at is not null)
);
create index permissions_lookup_idx on permissions(patient_id, institution_id, status, expires_at);
create index permissions_institution_idx on permissions(institution_id, status, expires_at);

create table permission_scopes (
  id            uuid primary key default gen_random_uuid(),
  permission_id uuid not null references permissions(id) on delete cascade,
  category_key  text not null references medical_record_categories(key),
  record_id     uuid references medical_records(id)
);
create unique index permission_scopes_uq on permission_scopes(permission_id, category_key, coalesce(record_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ---------------------------------------------------------------------------
-- Audit & activity (append-only — see 003)
-- ---------------------------------------------------------------------------
create table access_events (
  id                    bigint generated always as identity primary key,
  occurred_at           timestamptz not null default now(),
  actor_user_id         uuid references users(id),
  actor_professional_id uuid references healthcare_professionals(id),
  institution_id        uuid references healthcare_institutions(id),
  patient_id            uuid references patients(id),
  record_id             uuid references medical_records(id),
  category_key          text,
  action                access_action not null,
  outcome               access_outcome not null,
  denial_reason         text,
  permission_id         uuid references permissions(id),
  purpose               text,
  ip_address            inet,
  flagged               boolean not null default false
);
create index access_events_patient_idx on access_events(patient_id, occurred_at desc);
create index access_events_institution_idx on access_events(institution_id, occurred_at desc);
create index access_events_denied_idx on access_events(actor_user_id, occurred_at desc) where outcome = 'denied';

create table export_events (
  id             bigint generated always as identity primary key,
  occurred_at    timestamptz not null default now(),
  patient_id     uuid not null references patients(id),
  actor_user_id  uuid not null references users(id),
  institution_id uuid references healthcare_institutions(id),
  export_type    text not null check (export_type in ('attachment_download','record_summary_pdf','structured_bundle')),
  record_ids     uuid[] not null default '{}',
  destination    text not null default 'self_download',
  permission_id  uuid references permissions(id)
);
create index export_events_patient_idx on export_events(patient_id, occurred_at desc);

create table audit_logs (
  id             bigint generated always as identity primary key,
  occurred_at    timestamptz not null default clock_timestamp(),
  actor_user_id  uuid references users(id),
  actor_type     text not null default 'user' check (actor_type in ('user','system','integration')),
  action         text not null,
  entity_type    text not null,
  entity_id      text,
  patient_id     uuid references patients(id),
  institution_id uuid references healthcare_institutions(id),
  metadata       jsonb not null default '{}',
  ip_address     inet,
  prev_hash      text,
  hash           text not null
);
create index audit_logs_patient_idx on audit_logs(patient_id, occurred_at desc);
create index audit_logs_action_idx on audit_logs(action, occurred_at desc);
create index audit_logs_actor_idx on audit_logs(actor_user_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Notifications, support, incidents, settings
-- ---------------------------------------------------------------------------
create table notifications (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  type              text not null,
  title             text not null,
  body              text not null,
  link              text check (link is null or link ~ '^/'),
  severity          notification_severity not null default 'info',
  security_critical boolean not null default false,
  read_at           timestamptz,
  email_status      delivery_status not null default 'not_required',
  created_at        timestamptz not null default now()
);
create index notifications_user_idx on notifications(user_id, created_at desc);
create index notifications_unread_idx on notifications(user_id) where read_at is null;

create table notification_preferences (
  user_id     uuid not null references users(id) on delete cascade,
  type        text not null,
  in_app      boolean not null default true,
  email       boolean not null default true,
  updated_at  timestamptz not null default now(),
  primary key (user_id, type)
);

-- Outbox: email/SMS bodies are written here and delivered by an adapter.
-- Bodies must never contain clinical content — they point users to sign in.
create table message_outbox (
  id          uuid primary key default gen_random_uuid(),
  channel     text not null check (channel in ('email','sms')),
  recipient   text not null,
  user_id     uuid references users(id) on delete cascade,
  template    text not null,
  subject     text,
  body        text not null,
  status      delivery_status not null default 'queued',
  attempts    integer not null default 0,
  last_error  text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);
create index message_outbox_status_idx on message_outbox(status, created_at);

create table support_tickets (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique,
  requester_user_id uuid not null references users(id),
  requester_type    text not null check (requester_type in ('patient','institution','professional')),
  institution_id    uuid references healthcare_institutions(id),
  patient_id        uuid references patients(id),
  category          ticket_category not null,
  subject           text not null check (char_length(subject) between 4 and 200),
  description       text not null check (char_length(description) between 10 and 5000),
  status            ticket_status not null default 'open',
  priority          ticket_priority not null default 'normal',
  assigned_to       uuid references users(id),
  related_entity    text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  resolved_at       timestamptz
);
create trigger tickets_touch before update on support_tickets for each row execute function app.touch_updated_at();
create index support_tickets_status_idx on support_tickets(status, priority, created_at);
create index support_tickets_requester_idx on support_tickets(requester_user_id, created_at desc);

create table support_ticket_events (
  id          bigint generated always as identity primary key,
  ticket_id   uuid not null references support_tickets(id) on delete cascade,
  actor_user_id uuid references users(id),
  event_type  text not null check (event_type in ('created','comment','status_changed','assigned','priority_changed')),
  note        text,
  from_status ticket_status,
  to_status   ticket_status,
  visible_to_requester boolean not null default true,
  created_at  timestamptz not null default now()
);

create table security_incidents (
  id                     uuid primary key default gen_random_uuid(),
  reference              text not null unique,
  title                  text not null,
  description            text not null,
  category               text not null check (category in ('suspicious_access','repeated_denials','patient_report','emergency_access_review','account_compromise','data_breach','policy_violation','other')),
  severity               incident_severity not null default 'medium',
  status                 incident_status not null default 'open',
  source                 text not null check (source in ('automated','patient_report','institution_report','admin')),
  related_patient_id     uuid references patients(id),
  related_institution_id uuid references healthcare_institutions(id),
  related_user_id        uuid references users(id),
  reported_by            uuid references users(id),
  assigned_to            uuid references users(id),
  resolution_note        text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  resolved_at            timestamptz
);
create trigger incidents_touch before update on security_incidents for each row execute function app.touch_updated_at();
create index security_incidents_status_idx on security_incidents(status, severity, created_at desc);

create table platform_settings (
  key         text primary key,
  value       jsonb not null,
  description text not null,
  updated_by  uuid references users(id),
  updated_at  timestamptz not null default now()
);

-- Configurable governance policies (retention, privacy notices …).
create table policy_documents (
  id             uuid primary key default gen_random_uuid(),
  key            text not null check (key in ('privacy_notice','terms_of_service','retention_policy','data_subject_rights','emergency_access_policy')),
  version        integer not null,
  title          text not null,
  body           text not null,
  requires_legal_review boolean not null default true,
  effective_from timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  unique (key, version)
);

-- Human-friendly references (REQ-7F3K2Q etc.) — unambiguous alphabet, no 0/O/1/I.
create or replace function app.short_ref(prefix text) returns text
language plpgsql volatile as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  out text := '';
  b bytea := gen_random_bytes(6);
begin
  for i in 0..5 loop
    out := out || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);
  end loop;
  return prefix || '-' || out;
end $$;
