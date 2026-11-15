#!/usr/bin/env bash
# Disaster-recovery drill: restore the latest (or given) backup into a scratch
# database and prove it is usable. Never touches the live database.
#   bash scripts/restore-drill.sh [backup-dir]
set -euo pipefail
cd "$(dirname "$0")/.."
source <(grep -E '^(DATABASE_ADMIN_URL)=' .env.local 2>/dev/null || true)
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
B="${1:-$(ls -d .data/backups/* | sort | tail -1)}"
SRC="${DATABASE_ADMIN_URL:?}"
DRILL_DB="continuum_restore_drill"
DRILL_URL="${SRC%/*}/$DRILL_DB"
STORE=$(mktemp -d)
trap 'rm -rf "$STORE"' EXIT

echo "• verifying checksums"; ( cd "$B" && sha256sum --check --quiet SHA256SUMS )
psql "${SRC%/*}/postgres" -qc "drop database if exists $DRILL_DB" -c "create database $DRILL_DB"
echo "• restoring database"; "$PGBIN/pg_restore" --no-owner --exit-on-error --dbname "$DRILL_URL" "$B/database.dump"
echo "• restoring documents"; tar -C "$STORE" -xzf "$B/storage.tar.gz"

echo "• comparing row counts with the source"
for t in users patients medical_records medical_record_attachments permissions access_events audit_logs; do
  a=$(psql "$SRC" -tAc "select count(*) from $t"); b=$(psql "$DRILL_URL" -tAc "select count(*) from $t")
  printf "  %-28s source=%-6s restored=%s\n" "$t" "$a" "$b"
  # The live system may have moved on since the backup; restored must not exceed source.
  [ "$b" -le "$a" ] || { echo "restored has more rows than source?"; exit 1; }
done
echo "• audit hash chain"; psql "$DRILL_URL" -tAc "select 'valid=' || valid || ' entries=' || checked from app.verify_audit_chain()"
echo "• decrypting every restored document with the current keyring"
STORAGE_LOCAL_DIR="$STORE" DATABASE_ADMIN_URL="$DRILL_URL" npx tsx --conditions=react-server -e '
  (async () => {
    const { loadEnv } = await import("./scripts/env"); loadEnv();
    const postgres = (await import("postgres")).default; const { storage } = await import("./src/lib/storage");
    const sql = postgres(process.env.DATABASE_ADMIN_URL, { max: 1, onnotice: () => {} });
    const rows = await sql`select storage_key, sha256 from medical_record_attachments union all select storage_key, sha256 from institution_documents`;
    const { createHash } = await import("node:crypto"); let ok = 0, bad = 0;
    for (const r of rows) { try { const b = await storage().get(r.storage_key);
      if (createHash("sha256").update(b).digest("hex") === r.sha256) ok++; else bad++; } catch { bad++; } }
    console.log(`  documents verified=${ok} failed=${bad}`); await sql.end(); if (bad) process.exit(1);
  })();'
psql "${SRC%/*}/postgres" -qc "drop database $DRILL_DB"
echo "Restore drill PASSED for $B"
