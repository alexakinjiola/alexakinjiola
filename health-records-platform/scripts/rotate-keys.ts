/**
 * Re-encrypt stored documents and MFA secrets with the ACTIVE encryption key.
 *
 *   1. Generate a new key:        openssl rand -base64 32
 *   2. Prepend it to the keyring: APP_ENCRYPTION_KEYS="2:<new>,1:<old>"   (deploy; new data uses key 2)
 *   3. Run:                       pnpm keys:rotate
 *   4. When it reports 0 remaining, remove the old key from the keyring.
 *
 * Idempotent and resumable: items already on the active key are skipped (MFA)
 * or cheaply rewritten (storage). Runs with --conditions=react-server so it can
 * reuse the application's storage drivers.
 */
import postgres from "postgres";
import { loadEnv } from "./env";

async function main() {
  loadEnv();
  const { parseKeyring, open, seal, needsRotation } = await import("../src/lib/keyring");
  const { storage } = await import("../src/lib/storage");
  const ring = parseKeyring({ APP_ENCRYPTION_KEYS: process.env.APP_ENCRYPTION_KEYS, APP_ENCRYPTION_KEY: process.env.APP_ENCRYPTION_KEY });
  const sql = postgres(process.env.DATABASE_ADMIN_URL!, { max: 1, onnotice: () => {} });
  const result = { activeKey: ring.activeId, files: 0, fileErrors: 0, mfaRotated: 0, mfaCurrent: 0 };

  const keys = await sql<{ storage_key: string }[]>`
    select storage_key from medical_record_attachments union all select storage_key from institution_documents`;
  for (const { storage_key } of keys) {
    try {
      const plain = await storage().get(storage_key);
      await storage().put(storage_key, plain, "application/octet-stream");
      result.files++;
    } catch (e) {
      result.fileErrors++;
      console.error(JSON.stringify({ event: "rotate.file_failed", key: storage_key, error: (e as Error).message }));
    }
  }

  const users = await sql<{ id: string; mfa_secret_enc: string }[]>`select id, mfa_secret_enc from users where mfa_secret_enc is not null`;
  for (const u of users) {
    const blob = Buffer.from(u.mfa_secret_enc, "base64");
    if (!needsRotation(ring, blob)) { result.mfaCurrent++; continue; }
    const next = seal(ring, open(ring, blob, `mfa:${u.id}`), `mfa:${u.id}`).toString("base64");
    await sql`update users set mfa_secret_enc = ${next} where id = ${u.id} and mfa_secret_enc = ${u.mfa_secret_enc}`;
    result.mfaRotated++;
  }
  console.log(JSON.stringify(result));
  await sql.end();
  if (result.fileErrors) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
