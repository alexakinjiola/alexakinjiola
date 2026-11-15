import postgres from "postgres";
import { loadEnv } from "../scripts/env";

loadEnv();

/** Ensure Adaeze has a fresh pending request (from Meridian lab) so a test doesn't depend on other tests' state. */
export async function ensurePendingRequestForAdaeze() {
  const db = postgres(process.env.DATABASE_ADMIN_URL!, { max: 1, onnotice: () => {} });
  try {
    const [ada] = await db`select patient_id from patient_profiles where full_name = 'Adaeze Okafor'`;
    const [lab] = await db`select id from healthcare_institutions where name like 'Meridian%'`;
    const [bisi] = await db`select user_id from healthcare_professionals where full_name = 'Bisi Ogun'`;
    await db`update access_requests set status = 'cancelled' where patient_id = ${ada.patient_id} and institution_id = ${lab.id} and status = 'pending'`;
    await db.begin(async (tx) => {
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: bisi.user_id })}, true)`;
      await tx`select app.create_access_request(${lab.id}, ${ada.patient_id}, 'diagnostic_review', 'Test fixture: comparing cholesterol results.', array['lab_result'], null, null, 7)`;
    });
  } finally {
    await db.end();
  }
}
