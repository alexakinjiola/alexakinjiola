# Continuum — National Personal Health Records Platform (MVP)

A patient-controlled personal health record for Nigeria: patients keep their medical history across hospitals, verified institutions request scoped, time-limited access, and every access is traceable.

Three applications share one Next.js deployment, one session system and one PostgreSQL database with Row Level Security:

| App | Path | Who |
|---|---|---|
| Patient application | `/dashboard`, `/records`, `/timeline`, `/access`, `/activity`, `/settings` | Patients and verified representatives (parents, guardians) |
| Provider workspace | `/provider/*` | Verified hospitals, clinics, labs and their licensed staff |
| Administration console | `/admin/*` | Platform admins, security officers, support agents. **No clinical access.** |

> **Status:** a working MVP for demonstration and pilot preparation, not a production system. Read [`docs/DECISIONS.md`](docs/DECISIONS.md) for open decisions and the legal items that need Nigerian counsel. Nothing here is a claim of regulatory compliance or certification.

---

## Quick start (local)

Requirements: Node 20.9+ and pnpm. PostgreSQL 16 comes either from the local binaries (`scripts/db-local.sh`) or from Docker (`docker compose up -d db`).

Install dependencies:

```bash
pnpm install
```

Create your environment file:

```bash
cp .env.example .env.local
```

Fill in the three secrets in `.env.local`. Generate each with:

```bash
openssl rand -base64 32
```

Start PostgreSQL:

```bash
pnpm db:start
```

Apply the migrations and load the synthetic demo data:

```bash
pnpm db:reset
```

Run the app:

```bash
pnpm dev
```

Open http://localhost:3000. In development, emails and SMS codes aren't sent. You can read them at http://localhost:3000/dev/mailbox. That page is disabled when `APP_ENV=production`.

### Demo accounts (synthetic)

Every demo account uses the password **`Demo-Password-2026`**. Staff accounts also need a TOTP code. Add the secret to any authenticator app, or generate a code with `npx otplib`.

| Role | Email | TOTP secret |
|---|---|---|
| Patient (rich history, guardian of a minor) | `adaeze@demo.continuum.test` | n/a |
| Patient | `emeka@demo.continuum.test` | n/a |
| Patient (identity pending) | `halima@demo.continuum.test` | n/a |
| Clinician, Ikeja Specialist | `dr.eze@demo.continuum.test` | `KRSXG5CTMVRXEZLUKRSXG5CTMVRXEZLU` |
| Clinician, Lagos Island General | `dr.adeyemi@demo.continuum.test` | `MFRGGZDFMZTWQ2LKMFRGGZDFMZTWQ2LK` |
| Lab scientist, Meridian Diagnostics | `lab.ogun@demo.continuum.test` | `GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ` |
| Institution admin, Ikeja | `owner.ikeja@demo.continuum.test` | `NBSWY3DPNBSWY3DPNBSWY3DPNBSWY3DP` |
| Nurse (licence not yet verified) | `nurse.ibrahim@demo.continuum.test` | `KRSXG5CTMVRXEZLUKRSXG5CTMVRXEZLU` |
| Platform admin + security officer | `admin@demo.continuum.test` | `JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP` |

A good five-minute demo:

1. Sign in as **Adaeze** and open the pending request from Ikeja Specialist Hospital. Approve only part of it.
2. Sign in as **Dr Eze** and open *Authorised patients*. Only the approved categories are visible.
3. Back as **Adaeze**, revoke the permission. Dr Eze's open screen locks within 20 seconds.
4. **Adaeze → Activity history** shows every view, the blocked attempt, and a *Report suspicious activity* action.
5. Sign in as **Admin**, review the institution queue, then *Audit logs → Verify audit chain integrity*.

---

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js dev server, production build, production server |
| `pnpm db:start` / `pnpm db:stop` | Local PostgreSQL cluster in `.data/pg` |
| `pnpm db:migrate` | Apply pending migrations in `db/migrations` |
| `pnpm db:reset` | **Local only.** Drop everything, re-migrate, reseed synthetic data |
| `pnpm db:seed` | Seed synthetic demo data (refuses in production) |
| `pnpm jobs:expire` | Run the expiry job (permissions, requests, expiry warnings) |
| `pnpm test` | Vitest: authorization, RLS, audit, file security tests against real Postgres |
| `bash scripts/e2e.sh` | Reset, seed, start the server and run the Playwright browser flows and accessibility audit |
| `pnpm typecheck` / `pnpm lint` | TypeScript and ESLint |
| `pnpm icons` | Regenerate the Google Material Symbols subset |

## Documentation

| Document | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, the three-layer authorization model, folder structure |
| [docs/DATABASE.md](docs/DATABASE.md) | Entities, relationships, enums, RLS summary |
| [docs/API.md](docs/API.md) | Route handlers, server actions and the `app.*` SQL function API |
| [docs/SECURITY.md](docs/SECURITY.md) | Security and privacy implementation notes, risks, how each test requirement is verified |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Environment variables, Supabase deployment, jobs, backups, pilot checklist |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens, measured contrast, components, icons |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Assumptions, unresolved decisions, items for legal counsel |
| [docs/PROGRESS.md](docs/PROGRESS.md) | Phase-by-phase checklist with honest status |
