import postgres from "postgres";
import { afterAll } from "vitest";
import { adminClient } from "../scripts/fixtures";

export const admin = adminClient(process.env.TEST_DATABASE_ADMIN_URL!);
export const app = postgres(process.env.TEST_DATABASE_URL!, { max: 4, onnotice: () => {} });

afterAll(async () => {
  await admin.end();
  await app.end();
});

/** Expect a promise to reject with a given SQLSTATE. */
export async function expectCode(p: Promise<unknown>, code: string) {
  try {
    await p;
  } catch (e) {
    const got = (e as { code?: string }).code;
    if (got !== code) throw new Error(`Expected SQLSTATE ${code} but got ${got}: ${(e as Error).message}`);
    return;
  }
  throw new Error(`Expected SQLSTATE ${code} but the call succeeded`);
}

export async function accessEvents(filter: { actor?: string; patient?: string }) {
  return admin`
    select action, outcome, denial_reason, record_id, permission_id from access_events
    where (${filter.actor ?? null}::uuid is null or actor_user_id = ${filter.actor ?? null}::uuid)
      and (${filter.patient ?? null}::uuid is null or patient_id = ${filter.patient ?? null}::uuid)
    order by id`;
}
