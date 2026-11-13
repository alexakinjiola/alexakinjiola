# Security & privacy implementation notes

This describes what's actually implemented and how it's verified. It isn't a certification. An independent penetration test and a DPIA are pilot prerequisites.

## Most critical risks and mitigations

| # | Risk | Mitigation in this codebase |
|---|---|---|
| 1 | **Unauthorised clinical access** (curious staff, wrong institution, stale permission) | Every read goes through `app.authorizing_permission()`: user active → professional verified → affiliation active → capability → institution approved → permission active and *in date by `now()`* → category/record/date scope → named-professional check. RLS gives providers no direct path to clinical tables. |
| 2 | **Finding a patient treated as access** | Search returns a masked identity only (`Adaeze O.`, birth year, last 4 of Health ID), matches verified patients only, is rate-limited (30 per 10 min) and logged. Covered by test 2. |
| 3 | **Revocation or expiry not taking effect** | No cached authorization. Every request re-checks, so revocation takes effect immediately. Open screens poll `/api/provider/access-status` every 20 s and lock. Expiry is evaluated at read time regardless of status. |
| 4 | **Insider misuse by platform staff** | Admins have no RLS path to clinical tables and no provider capability. Admin mutations need MFA plus step-up within 10 minutes, and are audited with before/after values. |
| 5 | **Audit tampering** | `audit_logs`, `access_events`, `export_events` and `record_versions` are append-only (triggers block UPDATE, DELETE and TRUNCATE, even for `service_role`). `audit_logs` is hash-chained, and `app.verify_audit_chain()` detects edits by a superuser who disables triggers (tested). |
| 6 | **Account takeover** | argon2id; lockout after 5 failures (15 min); per-IP and per-account rate limits; MFA mandatory for staff; step-up for approvals, revocations, emergency access and admin actions; new-device alerts; all sessions revoked on password reset. |
| 7 | **Malicious uploads** | Magic-byte type detection; extension must match content; 10 MB limit; PDF active-content and EICAR checks; ClamAV hook; served with `nosniff` and a sandboxing CSP; never inline-executable. |
| 8 | **Storage leakage** | No public URLs. Random keys. AES-256-GCM with the storage key bound as AAD (blobs can't be swapped). Every read is authorised and logged by the database first. `Cache-Control: no-store`. |
| 9 | **IDOR via spoofed ids** | Identity comes only from the session-derived JWT claim. Ids in requests are targets, re-checked against the actor (test 15). |
| 10 | **Emergency access abused as a shortcut** | Separate function: 40+ character justification, minimum-necessary categories, 12 h cap, 3 per day per professional, patient notified (critical, can't be muted), automatic review incident, flagged if a routine request was pending. |

## Authentication

- Passwords: argon2id (19 MiB, t=2). Policy: at least 10 characters, a number or symbol, and a common-password deny-list. Breached-password checks are recommended before the pilot.
- Sessions: 256-bit random tokens; only the SHA-256 is stored. `HttpOnly`, `SameSite=Lax`, and `Secure` when `APP_ENV=production`. Idle and absolute timeouts are 60 min / 12 h for patients and 30 min / 10 h for staff.
- MFA: TOTP (RFC 6238). Secrets are encrypted at rest (AES-256-GCM, AAD bound to the user). Required for professionals and admins; optional for patients.
- Recovery: single-use reset tokens (hashed, 30 minutes) that never reveal whether an account exists. Lost-device recovery is a manual, identity-verified support process (documented in `/help/account-recovery`).

## Authorization layers

1. **Server code:** `requireActor` / `requirePatientContext` / `requireProviderContext` / `requirePlatformRole`, with Zod validation on every input.
2. **SQL functions:** each derives the actor from `app.uid()` and authorises the call itself. A denied read is *returned* rather than raised, so the denial log is committed.
3. **RLS:** enabled and **forced** on every table. Default deny.

## Web security

- CSP (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`), `X-Frame-Options: DENY`, `nosniff`, a strict Referrer-Policy, a Permissions-Policy, and HSTS in production. Note: `script-src 'unsafe-inline'` is currently required by Next.js inline bootstrapping. Nonce-based CSP is a hardening item.
- CSRF: Server Actions check Origin (built into Next.js). Upload routes call `assertSameOrigin` (tested).
- XSS: React escaping only. No `dangerouslySetInnerHTML`. User text is rendered as text.
- SQL injection: parameterised queries everywhere (`postgres` tagged templates). The one dynamic `ORDER BY` uses a fixed allow-list map.
- No health data in logs: `src/lib/log.ts` redacts keys such as name, title, description, note and email. Server logs carry ids and codes only.
- No health data in emails or SMS: bodies say "sign in to see details".

## How each testing requirement is verified

| Requirement | Test |
|---|---|
| 1 Patient can't view another's records | `tests/authorization.test.ts` › 1 |
| 2 Hospital can't access without authorisation | › 2 & BR-004 |
| 3 Professional can't use another institution's authorisation | › 3, partial approval (named professional) |
| 4 Rejected request grants nothing | › 4; e2e Flow F |
| 5 Expired request grants nothing | › 5 |
| 6 Expired permission grants nothing (even with stale status) | › E2E core / 6 |
| 7 Revoked permission grants nothing | › 7; e2e Flow G (browser) |
| 8 No deciding for another patient without a verified representative | › 8 (pending rep refused, active rep allowed, expired rep loses access) |
| 9 Unverified or suspended institution blocked | › 9 (suspension pauses and reinstatement restores permissions) |
| 10 Unauthorised staff can't submit | › 10 (admin role, unverified licence, suspended membership, patient) |
| 11 Admin can't see clinical data | › 11 |
| 12 Every protected access audited | › 12 (exact event sequence) |
| 13 Unauthorised exports blocked | › 13 |
| 14 No public file URLs; encrypted at rest | `tests/files-and-validation.test.ts` › 14; e2e 401/404/403 checks |
| 15 Direct calls can't bypass the frontend | › 15 (direct INSERT/UPDATE/DELETE, internal functions, spoofed ids); e2e CSRF and direct API |
| Emergency access controls | `tests/emergency-and-audit.test.ts` |
| Audit tamper evidence | same file |
| Anomaly detection | same file |
| Accessibility | `e2e/accessibility.spec.ts` (axe, WCAG 2.2 A/AA, 32 screens) |

## Known gaps (honest list)

- No external penetration test yet. No dependency/SAST pipeline wired up.
- ClamAV isn't deployed in this environment, so heuristics only.
- `script-src 'unsafe-inline'` in the CSP.
- The `X-Forwarded-For` trust model assumes exactly one trusted proxy.
- The Supabase storage driver is written against the documented API but untested here.
- Email and SMS delivery adapters aren't implemented. Messages wait in `message_outbox`.
- No key-rotation tooling for `APP_ENCRYPTION_KEY` / `IDENTIFIER_HASH_KEY`. The ciphertext version byte allows adding it.
- Integration (FHIR) ingestion endpoint not yet built.
