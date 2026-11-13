# Decisions, assumptions and open questions

Format: **decision**, then why, then what's still open. Items marked ⚖️ need confirmation by qualified Nigerian privacy and healthcare counsel before production.

## Architecture

**D-01 · PostgreSQL with Supabase-compatible roles, and a self-contained auth module instead of Supabase Auth (for now).**
The Supabase local stack couldn't run in the build environment (container images couldn't be pulled), and no hosted project was provided. Building against an unrunnable dependency would have meant shipping untested security code. The schema, roles (`anon`, `authenticated`, `service_role`) and the claim mechanism (`request.jwt.claims` → `app.uid()`) are identical to Supabase, so migrations and RLS run unchanged on a Supabase project.
*Open:* adopt Supabase Auth, or keep the auth module (argon2id, hashed opaque sessions, TOTP, lockout, step-up)? Swapping means replacing `src/lib/auth/session.ts` and `actor.ts` so they read the Supabase session, and pointing `users.id` at `auth.users.id`. The rest of the system doesn't change.

**D-02 · One Next.js deployment with three route trees.** The brief requires a single shared backend. Separate deployments would duplicate authorization code, which is where leaks come from. Each tree has its own guard, layout and navigation.

**D-03 · Business rules live in `SECURITY DEFINER` SQL functions.** Access requests, decisions, revocation, submissions, emergency access and every provider read go through one function. That keeps them atomic with their audit entries and impossible to bypass from any client, including direct database access with an `authenticated` role.
*Trade-off:* PL/pgSQL is less familiar than TypeScript. Mitigated by the integration test suite.

**D-04 · Providers have no RLS path to clinical tables.** They can only read through `app.provider_*` functions, which log every attempt. "Every access is logged" is therefore structural, not a convention.

**D-05 · File scanning.** Uploads are checked by magic bytes and scanned heuristically (EICAR, active PDF content), plus ClamAV when `CLAMAV_ADDRESS` is set. **ClamAV, or an equivalent managed scanner, is a pilot requirement.** The heuristics are not antivirus.

**D-06 · Material Symbols as an inline SVG subset.** The user preference specified Google icons. Shipping only the 130 glyphs in use, rather than the multi-megabyte font, matters on slow Nigerian mobile connections.

**D-07 · TanStack Query not used.** Server Components plus Server Actions cover every data need. The one live-polling need (the access guard) is a 20-second `fetch` loop. Adding a client cache for sensitive data would widen what's kept in browser memory.

## Product behaviour (assumptions)

- **A-01 · Unverified patients can't be found by providers or receive institutional records** (BR-018, reliable identity before association). They can still upload their own documents.
- **A-02 · "Patient association" for submission** means an existing care relationship, an active permission, or the professional attesting to an encounter. Attestation creates a logged care relationship and notifies the patient. **Submitting never grants read access.**
- **A-03 · Institutions can see metadata about records they submitted** (title, date, masked patient) for their own records management, but not the clinical content through the platform once it's on the patient record.
- **A-04 · Permissions default to the institution's authorised clinical staff.** The patient can restrict a grant to the requesting professional only.
- **A-05 · One pending request per institution per patient,** to prevent request spam.
- **A-06 · Request expiry 7 days, max permission 180 days, emergency 12 hours, 3 emergency uses per professional per day.** All of these are configurable in *Admin → System settings*.
- **A-07 · Patients viewing their own records are not logged as access events** (that would drown the meaningful entries). Their own downloads *are* logged as export events.
- **A-08 · Registration reveals whether an email is already registered.** This is accepted for usability. Password reset does not reveal it.
- **A-09 · Duplicate accounts are flagged, never merged automatically.**
- **A-10 · Demo staff accounts use fixed TOTP secrets.** Synthetic accounts only, and the seed script refuses to run in production.

## Open product decisions (from PRD §18, still open)

1. The operating model: independent, government-supported, or partnership-based.
2. Pilot institutions, and which identity verification provider (NIMC partner) to use. `IdentityProvider` is the integration seam.
3. National interoperability infrastructure. HL7 FHIR R4 adapters aren't built yet. The `integration_connections` table and the `integration` record source are in place.
4. ⚖️ Emergency access governance: who may break glass, for how long, and what the review SLA is.
5. ⚖️ Minors and representatives: age thresholds for a minor's own access, and the evidence required for guardianship and powers of attorney. The current flow requires manual admin verification.
6. ⚖️ Retention periods per record type, and what account closure deletes versus retains.
7. Commercial model and whether every patient feature stays free.

## ⚖️ Items for qualified Nigerian counsel

- Lawful basis for each processing activity under the **Nigeria Data Protection Act 2023** and NDPC guidance. Consent is not assumed to be the only basis: `authorization_basis` distinguishes consent, representative consent, emergency access and legal obligation.
- **National Health Act 2014**, s.26–30 (confidentiality, access and protection of health records): the platform's role relative to the institutions' own record-keeping duties.
- Text of the privacy notice, consent terms (`consent_versions`) and retention policy. Everything in `policy_documents` is marked DRAFT.
- Cross-border transfer: hosting region, sub-processors (email/SMS providers), and backups.
- Breach notification timelines and the incident-response procedure.
- Whether patients may delete their own uploads outright, or only mark them as errors (the current behaviour, which preserves the audit trail).
- Professional licensing verification: an agreement with MDCN, NMCN, PCN, MLSCN and RRBN for registry checks.
- Data Protection Impact Assessment before the pilot.
