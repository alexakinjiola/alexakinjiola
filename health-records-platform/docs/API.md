# API reference

The platform exposes three kinds of interface. Every one of them authenticates from the session cookie and re-checks authorization in the database.

## 1. HTTP route handlers (`src/app/api`)

| Method & path | Auth | Purpose | Responses |
|---|---|---|---|
| `GET /api/health` | none | Liveness and database check | `200 {status:"ok"}`, `503` |
| `POST /api/records/upload` | patient or representative session, same-origin | Multipart: `file`, `category`, `title`, `clinicalDate?`, `facility?`, `description?`. Validate → scan → encrypt → `app.patient_create_upload` | `200 {ok, recordId}`, `401`, `403` (CSRF / not a patient), `413`, `415`, `422 {fieldErrors}`, `429`, `503` (scanner unavailable) |
| `GET /api/files/:attachmentId[?institution=:id][&download=1]` | session (MFA-verified) | The **only** way to read a stored medical document. `app.authorize_attachment` decides and logs, then the bytes are streamed. | `200` file (`no-store`, sandbox CSP), `401`, `403`, `404` |
| `POST /api/provider/records` | staff session with MFA, same-origin | Multipart clinical submission: `institutionId`, `patientId`, `category`, `title`, `clinicalDate`, `description`, `structured` (JSON), `attest`, `encounterDate`, `files[]` (≤5) → `app.submit_clinical_record` | `200 {ok, recordId}`, `403` (logged denial), `409` (attestation needed), `422` |
| `POST /api/provider/institution-documents` | institution owner or `institution:manage` | Multipart licence evidence → `app.add_institution_document` | `200`, `403`, `409` (locked during review), `415` |
| `GET /api/provider/access-status/:patientId?institution=:id` | staff session | Polled by open clinical screens | `200 {active, expiresAt, reason}` |
| `GET /api/admin/institution-documents/:id` | platform admin (RLS) | View verification evidence. Audited. | `200` file, `404` |
| `POST /api/cron/expire` | `Authorization: Bearer $CRON_SECRET` | Runs `app.run_expiry()` | `200 {permissions_expired, requests_expired, expiry_warnings}`, `401` |

Error body shape: `{ "ok": false, "error": "<safe, user-facing message>", "fieldErrors"?: { field: message } }`. Internal errors never leak SQL or stack traces.

## 2. Server Actions

Server Actions return `ActionResult = { ok: true, data?, message? } | { ok: false, error, fieldErrors? }`. Inputs are validated with Zod (`src/lib/validation`).

| Module | Actions |
|---|---|
| `app/(auth)/actions.ts` | sign in, register (patient or provider), sign out, resend verification, forgot / reset password, MFA challenge, MFA setup begin / confirm, change password, disable MFA (patients only, password required), phone code send / verify, revoke session |
| `app/(patient)/actions.ts` | decide request (approve / partial / reject; step-up and acknowledgement required to share), revoke permission (step-up), raise correction, mark own upload as error, report suspicious activity, mark notifications read, update profile, notification preferences, NIN or in-person identity verification, support tickets, choose "acting for" (representatives), request representation |
| `app/provider/actions.ts` | switch institution, search patient, create / cancel access request, emergency access (step-up with code), register / update / submit institution, invite staff, change staff status, resolve corrections, accept invitation, contact platform |
| `app/admin/actions.ts` | institution status, professional status, end affiliation, user status, identity decision, representative status, emergency review, incident update, ticket update / internal note, settings, verify audit chain. All except tickets require step-up within 10 minutes. |

## 3. Database function API (`app.*`)

The stable contract for any other client, including a future mobile app or PostgREST. Each function derives the caller from `request.jwt.claims.sub`. Errors use `NP400`/`NP403`/`NP404`/`NP409`. Denied **reads** return `{allowed:false, reason}` and log the attempt.

| Function | Caller | Notes |
|---|---|---|
| `search_patients(inst, health_id, phone, dob, nin_hash)` | `access:request` | Verified patients only. Masked result. Logged. Rate-limited. |
| `create_access_request(inst, patient, purpose, detail, categories[], from, to, days)` | `access:request` | One pending request per institution and patient |
| `decide_access_request(request, 'approve'\|'partial'\|'reject', categories[], record_ids[], from, to, days, only_requester, note)` | patient or active representative | Can only narrow scope. Records basis and consent version. |
| `revoke_permission(permission, reason)` | patient or representative | Consent-based permissions only |
| `provider_patient_overview / provider_list_records / provider_get_record` | `records:view_authorized` | Logged allow / deny |
| `authorize_attachment(attachment, inst?)` | patient side (`inst` null) or provider | Logs access and export |
| `submit_clinical_record(...)` | `records:submit` | Association rule, duplicate flag, version 1, patient notified |
| `emergency_access(inst, patient, justification, categories[])` | `emergency:access` | See SECURITY.md |
| `patient_activity(patient, from, to, inst, kind, limit, offset)` | patient side | Unified feed |
| `admin_*`, `verify_audit_chain()` | platform roles | No clinical fields returned |
| `run_expiry()` | `service_role` / cron | Idempotent |
