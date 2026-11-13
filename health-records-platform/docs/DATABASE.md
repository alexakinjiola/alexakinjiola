# Database

PostgreSQL 16. The migrations live in `db/migrations` and are applied in order by `scripts/migrate.ts`, which tracks them in `schema_migrations`.

| Migration | Contents |
|---|---|
| 001 | Enums, all tables, constraints and indexes |
| 002 | Identity and authorization helpers (`app.uid()`, `app.provider_denial_reason()`, `app.authorizing_permission()`, Health ID generator) |
| 003 | Append-only triggers, hash-chained audit, `app.audit()`, notifications, `app.log_access()` with anomaly rules |
| 004 | Workflow functions (uploads, decisions, revocation, search, requests, provider reads, submissions, emergency access, corrections, activity feed, institutions, staff, admin, expiry) |
| 005 | Support tickets, incidents, settings, representatives, patient request detail, provider dashboard |
| 006 | Grants and RLS policies |
| 007 | Reference data: categories, roles and capabilities, consent v1, settings, draft policy documents |
| 008–010 | Provider and admin read models; admin document-view audit |

## Entities (the brief's 24, plus supporting tables)

| Brief entity | Table | Notes |
|---|---|---|
| users | `users` | Login identity. Personas hang off it. |
| patients | `patients` | Status, verification. `user_id` is nullable for minors managed by a representative. |
| patient_profiles | `patient_profiles` | Demographics and emergency contact. Patients can only update contact columns (column-level grant). |
| health_identifiers | `health_identifiers` | Platform Health ID (`NG` + 9 digits + Luhn). NIN stored only as an HMAC plus last 4 digits. |
| healthcare_institutions | `healthcare_institutions` | draft → submitted → under_review → approved / rejected; approved ↔ suspended |
| institution_documents | `institution_documents` | Licence evidence in private storage |
| healthcare_professionals | `healthcare_professionals` | Licence body and number, verification status |
| professional_affiliations | `professional_affiliations` | Professional ↔ institution ↔ role. One live membership per pair. |
| roles | `roles` | Data-driven capabilities (`records:view_authorized`, `records:submit`, `access:request`, `emergency:access`, `staff:manage` …) |
| medical_records | `medical_records` | CHECK constraints enforce provenance: patient uploads can never be "verified"; institutional records must name institution and professional. |
| medical_record_attachments | `medical_record_attachments` | Storage key, SHA-256, scan status |
| medical_record_categories | `medical_record_categories` | The 11 categories |
| record_versions | `record_versions` | Append-only snapshots. Records are never silently overwritten. |
| access_requests | `access_requests` + `access_request_categories` | Purpose, scope, duration, `respond_by` |
| permissions | `permissions` | Basis (consent / representative / emergency / legal), consent version, validity window, review status for emergency use |
| permission_scopes | `permission_scopes` | Category, or a specific record within a category |
| consent_versions | `consent_versions` | Versioned terms referenced by each consent-based permission |
| access_events | `access_events` | Every attempted protected read, allowed or denied, with reason. Append-only. |
| export_events | `export_events` | Downloads and exports. Append-only. |
| audit_logs | `audit_logs` | Hash-chained. Append-only. |
| notifications | `notifications` + `notification_preferences` | Security-critical notifications ignore preferences |
| identity_verifications | `identity_verifications` | Provider, method, status, reference |
| support_tickets | `support_tickets` + `support_ticket_events` | Categorised, with history and internal notes |
| integration_connections | `integration_connections` | Hashed API keys for future HMS/LIMS adapters |

Supporting tables: `auth_sessions`, `auth_tokens`, `known_devices`, `rate_limit_buckets`, `message_outbox` (service-role only); `patient_representatives`, `care_relationships`, `staff_invitations`, `record_corrections`, `security_incidents`, `platform_settings`, `policy_documents`.

## Key relationships

```
users 1─1 patients 1─1 patient_profiles
users 1─1 healthcare_professionals ─< professional_affiliations >─ healthcare_institutions
patients ─< medical_records ─< medical_record_attachments
                           └─< record_versions, record_corrections
patients ─< access_requests ─(0..1)─ permissions ─< permission_scopes
permissions ─< access_events          (one permission authorises many accesses)
patients ─< patient_representatives >─ users
patients ─< care_relationships >─ healthcare_institutions   (enables submission, never reading)
```

## RLS summary (006)

RLS is **enabled and forced** on every table. Default deny.

| Table group | Who can SELECT |
|---|---|
| Clinical (`medical_records`, attachments, versions) | Patient or active representative **only** |
| Profiles, identifiers | Patient or representative |
| Requests, permissions, scopes | Patient side, and members of the institution concerned |
| `access_events`, `export_events` | Patient; the institution with `activity:view`; security officers |
| `audit_logs` | Platform admins and security officers; institution `activity:view` for its own entries |
| Institutions | Everyone for approved and suspended; owner, members and platform staff otherwise |
| Auth tables, outbox | Nobody except `service_role` |

Writes by `authenticated` are limited to `notifications.read_at`, notification preferences, and patient contact columns. Everything else goes through `app.*` functions.
