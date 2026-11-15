#!/usr/bin/env bash
# Logical backup: database (custom format) + encrypted document store + checksum manifest.
# Production: prefer managed PITR (Supabase/RDS) and use this for portable off-site copies.
# Documents stay AES-256-GCM encrypted in the archive; keep the keyring OUT of the backup location.
set -euo pipefail
cd "$(dirname "$0")/.."
source <(grep -E '^(DATABASE_ADMIN_URL|STORAGE_LOCAL_DIR)=' .env.local 2>/dev/null || true)
OUT="${BACKUP_DIR:-.data/backups}/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$OUT"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
"$PGBIN/pg_dump" --format=custom --no-owner --file "$OUT/database.dump" "${DATABASE_ADMIN_URL:?}"
tar -C "${STORAGE_LOCAL_DIR:-.data/storage}" -czf "$OUT/storage.tar.gz" .
( cd "$OUT" && sha256sum database.dump storage.tar.gz > SHA256SUMS )
echo "$OUT"
