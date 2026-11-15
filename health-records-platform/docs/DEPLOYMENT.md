# Deployment guide

## Environment variables

See `.env.example`, which documents every variable. Production essentials:

| Variable | Notes |
|---|---|
| `APP_ENV=production` | Refuses the sandbox identity provider and the dev mailbox. Enables Secure cookies. Defaults to `production` for production builds. |
| `APP_URL` | Public HTTPS origin. Used for links and the CSRF origin check. |
| `DATABASE_URL` | A **non-owner** login role that is a member of `authenticated` and `service_role` only |
| `APP_ENCRYPTION_KEYS` (or `APP_ENCRYPTION_KEY`) | Keyring `"<id>:<b64 32 bytes>,…"`, active key first. From a secret manager, never committed, and never stored alongside backups. Losing a key makes the data encrypted with it unreadable. |
| `IDENTIFIER_HASH_KEY` / `IDENTIFIER_HASH_KEYS` | HMAC key(s) for NIN fingerprints; the list form keeps retired keys for lookup |
| `TRUSTED_PROXY_HOPS` | Exact number of reverse proxies that append to `X-Forwarded-For` (e.g. 1 for a single load balancer, 2 for CDN plus load balancer) |
| `PASSWORD_BREACH_CHECK=hibp` | Reject passwords found in known breaches (k-anonymity) |
| `SMS_DRIVER=termii` or `africastalking` + `SMS_API_KEY`, `SMS_SENDER_ID` / `SMS_USERNAME` | Transactional SMS (codes, critical alerts) |
| `CRON_SECRET` | Long random value for the scheduled job |
| `STORAGE_DRIVER=supabase` + `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | The bucket must be **private** |
| `CLAMAV_ADDRESS` | `host:3310` of a clamd instance (required for the pilot) |
| `IDENTITY_PROVIDER=manual_review` | Until a licensed NIN verification partner is integrated |

## Option A — Supabase + a Node host (recommended path)

1. Create a Supabase project in an approved region (see the cross-border item in DECISIONS.md). Enable PITR backups.
2. Run the migrations as the `postgres` role, with `DB_LOCAL_COMPAT=false` because Supabase already provides the roles and `pgcrypto`:

   ```bash
   DATABASE_ADMIN_URL=<supabase-direct-connection> DB_LOCAL_COMPAT=false pnpm db:migrate
   ```

   Functions reference `extensions` in their `search_path`, which matches where Supabase installs `pgcrypto`.
3. Create a dedicated login role for the app (`create role continuum_app login password '…' noinherit; grant authenticated, service_role to continuum_app;`) and use it in `DATABASE_URL` through the **session-mode** pooler. Transaction-mode pooling also works, because all claims are transaction-local.
4. Create a private Storage bucket `medical-records`. Leave every storage policy closed: the server reads it with the service key after authorizing in SQL.
5. Deploy the Next.js app (`pnpm build && pnpm start`) to a Node host behind TLS with exactly one trusted proxy (for `X-Forwarded-For`).
6. Schedule `POST /api/cron/expire` every 5–15 minutes and `POST /api/cron/deliver` every minute, both with `Authorization: Bearer $CRON_SECRET`.
7. **Do not seed synthetic data.** The seed script refuses when `NODE_ENV=production`.
8. Bootstrap the first platform admin manually: create the user, insert into `user_platform_roles`, and require MFA enrolment at first sign-in.

## Option B — self-hosted PostgreSQL

Same steps as A, but run `db/local/000_supabase_compat.sql` as a superuser first (`DB_LOCAL_COMPAT=true`). It creates the `anon`, `authenticated` and `service_role` roles and the extensions. Use encrypted volumes, TLS to the database, and WAL archiving.

## Operations

- **Backups:** managed PITR on the database, plus `pnpm db:backup` for portable off-site copies (database dump, encrypted document archive and checksums). Run `pnpm db:restore-drill` monthly. It restores into a scratch database and verifies row counts, the audit hash chain, and that every document decrypts and matches its SHA-256. It passed in development (see PROGRESS.md).
- **Monitoring:** ship stdout JSON logs. They're PHI-redacted, but treat them as sensitive anyway. Alert on `db.error`, a spike in `access_events` denials, and new `security_incidents`.
- **Audit integrity:** run *Admin → Audit logs → Verify* (or `select * from app.verify_audit_chain()`) on a schedule, and export chain heads to write-once storage.
- **Message delivery:** schedule `POST /api/cron/deliver` every minute (or `pnpm jobs:deliver`). Set `MAIL_DRIVER=smtp` and `SMTP_URL` (production refuses to start without them), plus `SMS_DRIVER=webhook` and `SMS_WEBHOOK_URL` for your SMS gateway. Failed messages retry at 1, 4, 16 and 64 minutes, then are marked `failed`. Alert on that.
- **Key rotation (encryption):** generate a key, deploy with it first in `APP_ENCRYPTION_KEYS`, run `pnpm keys:rotate`, and repeat until it reports no errors. Then remove the old key and redeploy. Rotate yearly, and immediately after any suspected exposure.
- **Key rotation (identifier HMAC):** prepend the new key to `IDENTIFIER_HASH_KEYS`. Never remove an old key while patients are still fingerprinted with it.

## Pilot readiness checklist

- [ ] Counsel review of every ⚖️ item in DECISIONS.md; privacy notice and consent text finalised
- [ ] DPIA completed from DPIA_TEMPLATE.md and signed off; vendor/processor agreements signed (hosting, email, SMS, identity)
- [ ] Independent penetration test; findings remediated
- [ ] ClamAV (or a managed scanner) live; `CLAMAV_ADDRESS` set; confirm an EICAR upload is rejected in staging
- [ ] Identity verification partner integrated (replace `manual_review`)
- [ ] SMTP and SMS credentials configured; delivery cron scheduled; one real SMS delivered through the provider sandbox (Termii DND sender ID approved, or Africa's Talking sandbox), then production
- [ ] Supabase Storage verified in staging: upload, download and `pnpm keys:rotate` against the real bucket
- [ ] Production backups configured; `pnpm db:restore-drill` passed against a production-like copy
- [ ] INCIDENT_RESPONSE.md contacts filled in; on-call rota; NDPC notification procedure confirmed by counsel
- [ ] Support team trained on identity reconciliation and account recovery
- [ ] Participating institutions signed; licences verified with the issuing authorities
- [ ] CI green on the release commit (`.github/workflows/health-records-platform.yml`)
- [ ] Load test repeated on production-like infrastructure (`scripts/load-test.mjs`)
- [ ] `TRUSTED_PROXY_HOPS` set for the real proxy chain; `PASSWORD_BREACH_CHECK=hibp`
