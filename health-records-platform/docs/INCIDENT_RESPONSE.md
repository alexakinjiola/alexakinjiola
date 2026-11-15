# Incident response runbook

> Draft for the pilot operations team. Statutory timelines and notification duties must be confirmed by Nigerian counsel before go-live. ⚖️

## Severity

| Level | Examples | Response |
|---|---|---|
| **SEV-1** | Confirmed unauthorised access to clinical data; key or database compromise; audit chain verification fails | Page on-call immediately; incident lead within 15 minutes; consider breach notification |
| **SEV-2** | Credible patient report of misuse; a professional accessing an unusual number of patients; emergency access judged inappropriate | Security officer within 4 hours |
| **SEV-3** | Repeated denied attempts with no data exposed; single-account compromise with no clinical access | Next working day |

Automated sources in the product: `security_incidents` (repeated denials, unusual volume, emergency reviews, patient reports), denied `access_events`, *Admin → Audit logs → Verify chain*.

## First hour — contain

1. **Open an incident** in *Admin → Security & incidents* (or confirm the automated one). Record every action there and in a timestamped log.
2. **Stop the access:**
   - One user: *Admin → Patient accounts* or *Professional verification* → **Suspend**. All sessions are revoked instantly.
   - One institution: *Admin → Institutions* → **Suspend**. Every active permission is paused and patients are notified.
   - One integration: *Provider → Integrations* → **Revoke key** (or as admin), which also kills any key still in its grace period.
   - Platform-wide emergency: scale the app to zero or block traffic at the load balancer. Data stays intact.
3. **Preserve evidence.** Take a backup (`pnpm db:backup`) *before* any clean-up. Don't delete rows: the audit tables are append-only by design. Export the relevant `access_events` and `audit_logs`.
4. **Check integrity.** Run *Verify audit chain integrity*. If it fails, treat the database itself as compromised (SEV-1).

## Investigate

- Who, what, when: `access_events` (every read attempt, with permission and IP), `export_events` (downloads), `audit_logs` (state changes, admin actions).
- Scope: which patients and which categories. The patient activity feed shows exactly what each affected patient can see.
- Root cause: credentials, an over-broad permission, insider misuse, a software defect, or a supplier.

## Notify ⚖️

| Who | When (to confirm with counsel) | How |
|---|---|---|
| Nigeria Data Protection Commission | NDPA 2023 requires notifying the Commission of a personal data breach likely to risk data subjects' rights, within **72 hours** of becoming aware | Counsel and the DPO |
| Affected patients | Without undue delay where there is high risk | In-app security notification (can't be muted) plus email/SMS; plain language, what happened, what we did, what they can do |
| Affected institutions | Promptly | Notification to institution admins plus a direct call |
| Partners and processors | Per contract | Contract owners |

Never include clinical details in emails or SMS. Point people to sign in.

## Recover and learn

- Rotate the secrets involved: `pnpm keys:rotate` for encryption keys (see DEPLOYMENT.md), integration keys, `CRON_SECRET` and database credentials.
- Resolve the incident record with a resolution note. The reporter is notified automatically.
- Hold a blameless review within 5 working days, with actions tracked to completion.

## Contacts (to fill in before the pilot)

| Role | Name | Phone | Backup |
|---|---|---|---|
| Incident lead / on-call | | | |
| Security officer | | | |
| Data Protection Officer | | | |
| Legal counsel | | | |
| Hosting / database provider support | | | |
