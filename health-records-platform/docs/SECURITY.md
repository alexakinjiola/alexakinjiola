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

- Passwords: argon2id (19 MiB, t=2). Policy: at least 10 characters, a number or symbol, and a common-password deny-list. With `PASSWORD_BREACH_CHECK=hibp`, passwords are also checked against Have I Been Pwned's k-anonymity range API (only a 5-character SHA-1 prefix leaves the server). The check fails open, with a logged warning, if the API is unreachable.
- Sessions: 256-bit random tokens; only the SHA-256 is stored. `HttpOnly`, `SameSite=Lax`, and `Secure` when `APP_ENV=production`. Idle and absolute timeouts are 60 min / 12 h for patients and 30 min / 10 h for staff.
- MFA: TOTP (RFC 6238). Secrets are encrypted at rest (AES-256-GCM, AAD bound to the user). Required for professionals and admins; optional for patients.
- Recovery: single-use reset tokens (hashed, 30 minutes) that never reveal whether an account exists. Lost-device recovery is a manual, identity-verified support process (documented in `/help/account-recovery`).

## Authorization layers

1. **Server code:** `requireActor` / `requirePatientContext` / `requireProviderContext` / `requirePlatformRole`, with Zod validation on every input.
2. **SQL functions:** each derives the actor from `app.uid()` and authorises the call itself. A denied read is *returned* rather than raised, so the denial log is committed.
3. **RLS:** enabled and **forced** on every table. Default deny.

## Web security

- Per-request **nonce-based CSP** (`src/proxy.ts`): `script-src 'self' 'nonce-…' 'strict-dynamic'`, with no inline scripts unless they carry the nonce. Also `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'`, plus `X-Frame-Options: DENY`, `nosniff`, a strict Referrer-Policy, a Permissions-Policy, and HSTS in production. `style-src` allows `'unsafe-inline'` because inline style attributes (Radix positioning, charts) can't carry nonces. That's a much lower risk than inline script.
- Client IP: taken from `X-Forwarded-For`, trusting exactly `TRUSTED_PROXY_HOPS` proxies (right-most entries), so spoofed left-most values are ignored (tested).
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

## Findings fixed during this phase

- **Function privileges:** PostgreSQL grants `EXECUTE` to `PUBLIC` on new functions. Functions added after migration 006 had silently regained it, including server-only `integration_ingest`. A first attempt to change the *global* default privileges (016) over-reached: after a reset it also closed extension functions such as `citext_eq` and broke sign-in, which the browser tests caught. The final design (017) restores PostgreSQL's default and has the migration runner revoke `PUBLIC`/`anon` execute across the `app` schema after every run. A regression test fails if any `app.*` function is executable by `anon`, if internal helpers are callable by clients, **or** if extension functions become unusable.
- **Clinical value integrity in PDFs:** Unicode normalisation turned `×10⁹/L` into `×109/L` in the PDF summary. Exponents are now rendered as `^9` before normalisation, and this is covered by a unit test.

## Key management

- **Encryption keyring:** `APP_ENCRYPTION_KEYS="2:<new>,1:<old>"`. New data uses the first key, and every ciphertext records its key id. `pnpm keys:rotate` re-encrypts documents and MFA secrets. Once it reports nothing remaining, remove the old key. Drill-tested.
- **Identifier fingerprint key:** NINs are never stored, so the fingerprint key can't be re-applied to existing records. `IDENTIFIER_HASH_KEYS="<new>,<old>"` keeps retired keys for lookup only; patients who re-verify are re-fingerprinted with the new key.
- **Integration keys:** shown once, stored as SHA-256, expire after `integration.key_max_days` (default 365), and rotate with a grace period (default 24 h). Revocation also kills any key still in its grace period. Institutions are warned 30 days before expiry.

## Known gaps (honest list)

- **No independent penetration test yet.** This must be done by an external party before the pilot. Automated checks in CI: typecheck, lint, the full test suites, and `pnpm audit` (high/critical fail the build).
- Provider adapters (ClamAV, Supabase Storage, Termii, Africa's Talking) are verified against local protocol mocks, **not** the real services. Run each against its sandbox or staging before the pilot (checklist in DEPLOYMENT.md).
- Breached-password checking fails open during an HIBP outage, which is a deliberate availability trade-off.
- Screen-reader behaviour is verified through automated accessibility-tree, keyboard and axe checks. Manual testing with TalkBack and VoiceOver by people who use them is still required.
