# Architecture

Working name: **Continuum**. It's a placeholder and can be configured through `NEXT_PUBLIC_PLATFORM_NAME`.

This document explains how the platform is put together and why. Read it before you change anything in `db/`, `src/server/` or `src/lib/auth/`.

---

## 1. One backend, three applications

```
                        ┌──────────────────────── Next.js 16 (App Router) ────────────────────────┐
  Browser ──HTTPS──▶    │  proxy.ts  (coarse redirect only, never an authorization decision)       │
                        │                                                                          │
                        │  app/(patient)/…      app/provider/…        app/admin/…                  │
                        │      Patient app         Provider workspace     Admin console            │
                        │           │                    │                      │                  │
                        │           └──── Server Actions / Route Handlers ──────┘                  │
                        │                           │                                              │
                        │                 src/server/*  (services)                                 │
                        │                 • Zod validation   • getActor() session check            │
                        │                 • calls SQL functions inside withActor() transactions     │
                        └───────────────────────────┬──────────────────────────────────────────────┘
                                                    │  SET LOCAL ROLE authenticated
                                                    │  request.jwt.claims = {"sub": <user id>}
                        ┌───────────────────────────▼──────────────────────────────────────────────┐
                        │ PostgreSQL 16                                                            │
                        │  • Row Level Security on every table holding personal data               │
                        │  • app.* SECURITY DEFINER functions own every state change that matters  │
                        │    (access requests, decisions, revocation, submissions, record reads)   │
                        │  • append-only, hash-chained audit_logs and access_events                │
                        └──────────────────────────────────────────────────────────────────────────┘
                                                    │
                        Private object storage (StorageDriver): local AES-256-GCM encrypted
                        files in development; Supabase Storage private bucket in deployment.
```

The three applications share **one** Next.js deployment, one session system, one database and one set of authorization functions. They're separate route trees, each with its own layout, navigation and guard. That's deliberate: separate deployments would mean three copies of the authorization logic, and that's exactly where drift turns into data leaks.

## 2. Why not the full Supabase stack (yet)

The brief asks for Supabase. In this development environment the Supabase local stack can't start, because its container images can't be pulled, and no hosted project credentials were provided. Rather than build something that can't run or be tested, the platform is built in a way that stays Supabase-compatible:

| Concern | How it runs here | How it maps onto Supabase |
|---|---|---|
| Database | PostgreSQL 16 (`npm run db:start`) | Same migrations. They use the Supabase role names `anon`, `authenticated` and `service_role`, and read the user id from `request.jwt.claims`, exactly as `auth.uid()` does. `db/local/000_supabase_compat.sql` creates those roles locally. Don't run it on Supabase, where they already exist. |
| RLS | Enforced in every request transaction | Identical. Policies call `app.uid()`, which reads the same claim. |
| Auth | `src/lib/auth/*`: argon2id passwords, hashed opaque session tokens, TOTP MFA, lockout, step-up re-authentication | Replace `AuthProvider` with Supabase Auth (`@supabase/ssr`). Map `users.id` to `auth.users.id`. |
| File storage | `LocalEncryptedStorage` (AES-256-GCM, outside the web root) | `SupabaseStorage` driver (private bucket, 60-second signed URLs, served only through an authorized route). |
| Email/SMS | Outbox table and a dev-only mailbox viewer | Swap the `Mailer` adapter for SMTP, Resend or an SMS gateway. |

**This is the most important unresolved architecture decision** (see `docs/DECISIONS.md`, D-01).

## 3. Authorization model

Authorization runs in three layers. Each one is enough to stop an unauthorized read by itself.

1. **Service layer** (`src/server/**`): every operation starts with `requireActor()`. It validates the session, the user's status, MFA completion and the persona (patient, professional or admin). Inputs are parsed with Zod, and nothing trusts identifiers sent from the client.
2. **SQL functions** (`app.*`, SECURITY DEFINER, pinned `search_path`): access requests, approvals, revocations, clinical submissions, emergency access and every provider record read go through one function. Each function re-derives the actor from the JWT claim and checks:
   authenticated user → user active → professional verified → affiliation active → role capability → institution approved → patient verified → permission active, not expired, not revoked → category / record / date-range scope.
   A denied read **returns** a denial instead of raising, so the denial can be written to `access_events` and committed.
3. **Row Level Security** on the tables themselves. If someone writes an ad-hoc query in the service layer, RLS still stops the leak. Administrators have **no** RLS path to `medical_records`, `medical_record_attachments` or `record_versions`. They only see aggregate counts through dedicated functions.

### The rule that matters most

> Finding a patient never grants access.

`app.search_patients()` returns a masked identity summary and logs the search. Clinical access exists only while there's a row in `permissions` with `status = 'active'`, `now()` between `valid_from` and `expires_at`, and a matching scope. Expiry is checked at read time, so a stale status column can never extend access. A scheduled job (`npm run jobs:expire`) flips statuses and sends notifications afterwards.

### Legal basis is explicit

Every permission carries an `authorization_basis`: `patient_consent`, `representative_consent`, `emergency_access` or `legal_obligation`. Consent-based permissions must reference a `consent_versions` row. Emergency access is a separate function. It requires a written justification, is capped at a configurable number of hours, is limited to minimum-necessary categories, notifies the patient and opens a retrospective review item for administrators. It can't be used while a routine request is pending for the same institution.

## 4. Sessions and authentication

* Session tokens are 256-bit random values. The database stores only their SHA-256 hash, so a database leak doesn't hand out live sessions.
* Cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production. Idle and absolute timeouts are set per persona (stricter for providers and admins).
* Lockout: 5 failed passwords lock the account for 15 minutes. A per-IP limit throttles credential stuffing.
* MFA (TOTP) is **mandatory** for professionals and administrators and optional for patients. Sensitive actions (approving access, exporting, changing security settings) need step-up re-authentication within the last 10 minutes.
* New-device detection uses a random long-lived device cookie, stored hashed. The first login on an unknown device triggers an in-app and email security alert.
* CSRF: Server Actions verify `Origin`, and route handlers that change state check `Origin` explicitly. Cookies are `SameSite=Lax`.

## 5. Files

* Validation goes by **magic bytes**, not the extension: PDF, JPEG and PNG only, 10 MB maximum.
* `FileScanner` checks for the EICAR signature, active PDF content (`/JavaScript`, `/JS`, `/Launch`, `/EmbeddedFile`, `/OpenAction` with JS) and mismatched types. **This is not a replacement for antivirus.** A `ClamAVScanner` adapter is the pilot requirement (D-05).
* Storage keys are random UUIDs, so there's never a public URL. Downloads go through `/api/files/[attachmentId]`, which re-runs the authorization function, logs an access or export event and streams with `Cache-Control: no-store`.

## 6. Audit

* `audit_logs` covers administrative and security actions. `access_events` covers every attempted read of protected data, allowed or denied. `export_events` covers downloads and exports.
* All three are append-only. A trigger blocks `UPDATE` and `DELETE`, and no role except the function owner has `INSERT`.
* `audit_logs` is hash-chained (`hash = sha256(prev_hash || canonical row)`). `app.verify_audit_chain()` detects tampering, and the admin console exposes the check.
* Audit metadata never contains clinical content. It holds identifiers and categories only.

## 7. Folder structure

```
health-records-platform/
├── db/
│   ├── local/000_supabase_compat.sql    roles + extensions for non-Supabase Postgres
│   └── migrations/                      ordered, idempotent-by-tracking SQL migrations
├── docs/                                architecture, API, security, deployment, decisions
├── e2e/                                 Playwright end-to-end flows
├── scripts/                             db, migrate, seed, icons, expiry job
├── src/
│   ├── app/
│   │   ├── (auth)/                      sign-in, register, verify, reset, MFA
│   │   ├── (patient)/                   patient application
│   │   ├── provider/                    provider workspace + institution onboarding
│   │   ├── admin/                       administration console
│   │   └── api/                         file upload/download, status polling, cron
│   ├── components/
│   │   ├── ui/                          design-system primitives
│   │   ├── shell/                       app shells per persona
│   │   └── domain/                      record cards, permission summaries, timelines
│   ├── lib/                             auth, db, storage, scanning, validation, utils
│   └── server/                          domain services (patient, provider, admin)
└── tests/                               Vitest unit + integration (real Postgres)
```
