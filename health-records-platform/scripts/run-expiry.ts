/** Runs the expiry job once (for cron hosts without HTTP). Same effect as POST /api/cron/expire. */
import postgres from "postgres";
import { loadEnv } from "./env";

async function main() {
  loadEnv();
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });
  const [{ r }] = await sql.begin(async (tx) => {
    await tx`select set_config('role', 'service_role', true)`;
    return tx`select app.run_expiry() as r`;
  });
  console.log(JSON.stringify(r));
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
