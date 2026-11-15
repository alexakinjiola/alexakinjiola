#!/usr/bin/env bash
# Reset the dev database to the synthetic seed, (re)start the production server, run browser flows.
# A schema reset invalidates a running server's cached type OIDs, so the server is always restarted.
set -euo pipefail
cd "$(dirname "$0")/.."
pkill -f "next start" 2>/dev/null || true; pkill -f "next-server" 2>/dev/null || true
npx tsx scripts/migrate.ts --reset >/dev/null
rm -rf .data/storage
npx tsx scripts/seed.ts >/dev/null
# Test runs sign in hundreds of times; scale limits (ignored when APP_ENV=production).
(RATE_LIMIT_SCALE=50 nohup pnpm start > .data/e2e-server.log 2>&1 &)
for _ in $(seq 1 60); do curl -sf localhost:3000/api/health >/dev/null && break; sleep 1; done
E2E_BASE_URL=http://localhost:3000 npx playwright test --trace off "$@"
