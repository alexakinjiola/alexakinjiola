/** Drains the message outbox once. Schedule every minute (or call POST /api/cron/deliver). */
import postgres from "postgres";
import { loadEnv } from "./env";
import { deliverDue, deliveryConfigFromEnv } from "../src/lib/messaging/delivery";

async function main() {
  loadEnv();
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });
  console.log(JSON.stringify(await deliverDue(sql, deliveryConfigFromEnv())));
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
