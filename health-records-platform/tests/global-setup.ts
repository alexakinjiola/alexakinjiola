import { loadEnv } from "../scripts/env";
import { migrate } from "../scripts/migrate";

export default async function setup() {
  loadEnv();
  const url = process.env.TEST_DATABASE_ADMIN_URL;
  if (!url) throw new Error("TEST_DATABASE_ADMIN_URL is not set (see .env.example)");
  await migrate(url, { reset: true, compat: true, quiet: true });
}
