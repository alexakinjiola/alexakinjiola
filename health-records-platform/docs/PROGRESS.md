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
- ✅ 40 integration tests against real Postgres (all 15 required security cases plus emergency, audit, anomaly, files, export, integrations, delivery worker, function-privilege regression, PDF clinical-value safety)
- ✅ 13 browser tests: flows A–I, export downloads, representative request, integration lifecycle over HTTP, API-bypass and CSRF checks, axe WCAG 2.2 AA on 39 screens
- ✅ Production build; typecheck and lint clean
- 🟡 Responsive: verified visually on desktop and a 390px phone; no device-lab testing yet
- ⬜ Load testing against the PRD performance targets; external penetration test

## Phase 7 — Pilot preparation
- ✅ Demo accounts and synthetic data · setup, deployment, security and API documentation · pilot checklist (DEPLOYMENT.md)
- ✅ Message delivery worker (SMTP and SMS-gateway drivers, retries with backoff, multi-instance safe)
- ⬜ Items listed in DECISIONS.md (legal, identity partner, ClamAV deployment, SMS provider choice)
