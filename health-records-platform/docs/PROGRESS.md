# Progress checklist

✅ done and verified by tests · 🟡 done, partly verified or with a known limitation · ⬜ not started

## Phase 1 — Setup
- ✅ Repository inspected (personal portfolio site, left untouched; the platform lives in `health-records-platform/`)
- ✅ Next.js 16, React 19, TypeScript, Tailwind v4, Radix (shadcn pattern), React Hook Form + Zod
- ✅ Local PostgreSQL 16 tooling; Supabase-compatible role model
- ✅ Design tokens, component library, icon pipeline
- ✅ Vitest, Playwright, ESLint (TypeScript 6 for `typescript-eslint` compatibility)

## Phase 2 — Database & backend
- ✅ Normalised schema covering all 24 required entities plus supporting tables; constraints and indexes
- ✅ RLS on every table (forced); column-level grants
- ✅ Authorization helpers and workflow functions
- ✅ Append-only, hash-chained audit
- ✅ Private encrypted storage (local driver); 🟡 Supabase driver written, untested
- ✅ Authentication: argon2id, sessions, lockout, TOTP MFA, step-up, new-device alerts, password reset, email and phone verification
- ✅ Synthetic seed via real workflows

## Phase 3 — Patient application
- ✅ Registration → email verification → identity verification (sandbox / manual) → dashboard
- ✅ Dashboard from live data · records with search, filters, sort and pagination · record detail with versions, viewers and corrections
- ✅ Upload with validation, scanning, progress, retry and success · timeline with completeness notice
- ✅ Access management (4 tabs), full/partial approval, decline, revoke with step-up
- ✅ Activity history with filters and suspicious-activity reporting · notification centre and preferences
- ✅ Profile, identity, security (MFA, sessions, password, phone), privacy and data rights, support
- ✅ Representatives: request page, admin verification, "acting for" switcher, enforcement in every query
- ✅ Patient export: PDF summary (allergies and diagnoses first, provenance per entry) and FHIR R4 Bundle; step-up, logged, patient notified

## Phase 4 — Provider workspace
- ✅ Institution registration, documents and submission · staff invitations, roles, suspend/remove · invitation acceptance with licence details
- ✅ Dashboard from live data · masked patient search · access requests · authorised patients · scoped record view with live access guard
- ✅ Clinical submission with provenance, attachments, structured lab values, encounter attestation, duplicate flagging
- ✅ Emergency access workflow · patient query (correction) responses · institution activity logs
- ✅ Records-system integrations: institution registers a connection (key shown once), platform activates, FHIR R4 Bundle ingestion endpoint (idempotent, verified patients only)

## Phase 5 — Administration
- ✅ Overview with aggregates and access chart · institution verification (approve, reject, suspend, reinstate) · professional verification
- ✅ Patient account support, identity queue, representative verification · security incidents, emergency reviews, denied attempts, exports
- ✅ Audit log with chain verification · support tickets with history and internal notes · configurable settings

## Phase 6 — Testing & hardening
- ✅ 49 database/integration tests against real Postgres: all 15 required security cases, emergency access, audit tamper-evidence, anomaly detection, files, export, integrations (incl. key lifecycle), delivery worker, function-privilege regression (both directions), PDF clinical-value safety, keyring rotation, proxy-hop IP trust, breached-password check
- ✅ Provider adapters verified against local protocol mocks: ClamAV (clamd INSTREAM, fails closed), Supabase Storage (encrypted before upload), Termii, Africa's Talking
- ✅ 21 browser tests: flows A–I, export, representatives, integration lifecycle over HTTP, API-bypass and CSRF, keyboard-only use (skip link, focus trap, Escape, radio arrows), Android (Pixel 7) and small iPhone (320px) layouts, axe WCAG 2.2 AA on 39 screens
- ✅ Nonce-based CSP (no inline scripts); encryption keyring with rotation tool (drill-tested); identifier-key rotation for lookup; integration key expiry and rotation
- ✅ Local load test: all PRD §8.3 targets met (`docs/load-test-results.json`, 4-core dev machine — repeat on production-like infrastructure)
- ✅ Backup and restore drill passed (row counts, audit chain valid, every document decrypts and matches its SHA-256)
- ✅ CI workflow: typecheck, lint, tests, build, browser suite, `pnpm audit` (no known vulnerabilities at time of writing)
- ⬜ **Independent** penetration test (external party required)
- ⬜ Manual screen-reader testing (TalkBack / VoiceOver) by people who use them daily
- ⬜ Real-service verification of ClamAV, Supabase Storage and the chosen SMS provider in staging (checklist in DEPLOYMENT.md)

## Phase 7 — Pilot preparation
- ✅ Demo accounts and synthetic data · setup, deployment, security and API documentation · pilot checklist (DEPLOYMENT.md)
- ✅ Message delivery worker (SMTP; Termii, Africa's Talking or webhook SMS; retries with backoff; multi-instance safe)
- ✅ Incident response runbook (INCIDENT_RESPONSE.md) and DPIA working draft (DPIA_TEMPLATE.md)
- ⬜ Needs people, not code: counsel review of ⚖️ items, DPIA sign-off, choosing and contracting the identity, SMS and hosting providers, signing pilot institutions, filling in the incident contacts
