# Deployment guide

## Environment variables

See `.env.example`, which documents every variable. Production essentials:

| Variable | Notes |
|---|---|
| `APP_ENV=production` | Refuses the sandbox identity provider and the dev mailbox. Enables Secure cookies. Defaults to `production` for production builds. |
| `APP_URL` | Public HTTPS origin. Used for links and the CSRF origin check. |
| `DATABASE_URL` | A **non-owner** login role that is a member of `authenticated` and `service_role` only |
| `APP_ENCRYPTION_KEY`, `IDENTIFIER_HASH_KEY` | 32 random bytes each, from a secret manager. Never commit them. Losing them makes stored files and NIN hashes unusable. |
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
6. Schedule `POST /api/cron/expire` every 5–15 minutes with `Authorization: Bearer $CRON_SECRET`.
7. **Do not seed synthetic data.** The seed script refuses when `NODE_ENV=production`.
8. Bootstrap the first platform admin manually: create the user, insert into `user_platform_roles`, and require MFA enrolment at first sign-in.

## Option B — self-hosted PostgreSQL

Same steps as A, but run `db/local/000_supabase_compat.sql` as a superuser first (`DB_LOCAL_COMPAT=true`). It creates the `anon`, `authenticated` and `service_role` roles and the extensions. Use encrypted volumes, TLS to the database, and WAL archiving.

## Operations

- **Backups:** daily full backup plus PITR. Test a restore before the pilot (PRD launch gate). Storage needs its own backup policy.
- **Monitoring:** ship stdout JSON logs. They're PHI-redacted, but treat them as sensitive anyway. Alert on `db.error`, a spike in `access_events` denials, and new `security_incidents`.
- **Audit integrity:** run *Admin → Audit logs → Verify* (or `select * from app.verify_audit_chain()`) on a schedule, and export chain heads to write-once storage.
- **Message delivery:** implement a worker that drains `message_outbox` (status `queued`) to an SMTP/SMS provider, with retry and backoff.
- **Key rotation:** plan a re-encryption job before rotating `APP_ENCRYPTION_KEY`. The ciphertext carries a version byte for this.

## Pilot readiness checklist

- [ ] Counsel review of every ⚖️ item in DECISIONS.md; privacy notice and consent text finalised
- [ ] DPIA completed; vendor/processor agreements signed (hosting, email, SMS, identity)
- [ ] Independent penetration test; findings remediated
- [ ] ClamAV (or a managed scanner) live; `CLAMAV_ADDRESS` set
- [ ] Identity verification partner integrated (replace `manual_review`)
- [ ] Email and SMS delivery worker live; SMS for critical security alerts
- [ ] Backups and a disaster-recovery restore tested
- [ ] Incident response runbook and on-call rota; breach notification procedure
- [ ] Support team trained on identity reconciliation and account recovery
- [ ] Participating institutions signed; licences verified with the issuing authorities
- [ ] Nonce-based CSP; dependency scanning in CI
