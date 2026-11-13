import { loadEnv } from "../scripts/env";

loadEnv();
// Integration tests run against the disposable test database only.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
