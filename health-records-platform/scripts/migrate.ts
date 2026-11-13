/**
 * Applies db/migrations/*.sql in order, once each, inside a transaction per file.
 *   tsx scripts/migrate.ts            apply pending migrations
 *   tsx scripts/migrate.ts --reset    LOCAL ONLY: drop everything and re-apply
 *
 * Uses DATABASE_ADMIN_URL (migration owner). Set DB_LOCAL_COMPAT=false when
 * targeting Supabase — the Supabase roles/extensions already exist there.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { loadEnv } from "./env";

loadEnv();
const url = process.env.DATABASE_ADMIN_URL;
if (!url) throw new Error("DATABASE_ADMIN_URL is not set");
const reset = process.argv.includes("--reset");
const compat = (process.env.DB_LOCAL_COMPAT ?? "true") === "true";

export async function migrate(databaseUrl: string, opts: { reset?: boolean; compat?: boolean; quiet?: boolean } = {}) {
  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  const log = (m: string) => !opts.quiet && console.log(m);
  try {
    if (opts.reset) {
      const host = new URL(databaseUrl).hostname;
      if (!["127.0.0.1", "localhost"].includes(host) || process.env.NODE_ENV === "production") {
        throw new Error("Refusing to reset a non-local database.");
      }
      await sql.unsafe(`drop schema if exists app cascade; drop schema if exists public cascade; create schema public;
                        grant usage on schema public to public;`);
      log("• schemas dropped");
    }
    if (opts.compat) {
      await sql.unsafe(readFileSync(join(process.cwd(), "db/local/000_supabase_compat.sql"), "utf8"));
    }
    await sql.unsafe(`create table if not exists public.schema_migrations (
      name text primary key, applied_at timestamptz not null default now())`);
    // schema_migrations is migration bookkeeping only; keep it away from clients.
    await sql.unsafe(`alter table public.schema_migrations enable row level security;
                      revoke all on public.schema_migrations from public`);
    const applied = new Set((await sql<{ name: string }[]>`select name from schema_migrations`).map((r) => r.name));
    const dir = join(process.cwd(), "db/migrations");
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      if (applied.has(file)) continue;
      const body = readFileSync(join(dir, file), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`insert into schema_migrations(name) values (${file})`;
      });
      log(`✓ ${file}`);
    }
    log("Migrations up to date.");
  } finally {
    await sql.end();
  }
}

if (process.argv[1]?.endsWith("migrate.ts")) {
  migrate(url, { reset, compat }).catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  });
}
