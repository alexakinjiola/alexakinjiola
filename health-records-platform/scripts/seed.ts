/**
 * SYNTHETIC demo data. Every person, institution and record here is fictional
 * and flagged is_synthetic = true. Never run against production.
 *
 *   tsx scripts/seed.ts            seed the development database
 *
 * Workflow state (requests, approvals, revocations, clinical submissions) is
 * created by calling the real app.* functions as the relevant user, so audit
 * logs, access events and notifications are genuine.
 */
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import postgres from "postgres";
import { hash } from "@node-rs/argon2";
import { loadEnv } from "./env";
import { adminClient, affiliate, as, createInstitution, createPatient, createProfessional, createUser, grantPlatformRole } from "./fixtures";

loadEnv();
if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed synthetic data in production.");
const adminUrl = process.env.DATABASE_ADMIN_URL!;
const appUrl = process.env.DATABASE_URL!;
const KEY = Buffer.from(process.env.APP_ENCRYPTION_KEY!, "base64");
const STORAGE = process.env.STORAGE_LOCAL_DIR ?? ".data/storage";

export const DEMO_PASSWORD = "Demo-Password-2026";
/** Fixed TOTP secrets so demo staff can sign in (add these to an authenticator app). Synthetic accounts only. */
export const DEMO_TOTP = {
  admin: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
  clinician: "KRSXG5CTMVRXEZLUKRSXG5CTMVRXEZLU",
  clinician2: "MFRGGZDFMZTWQ2LKMFRGGZDFMZTWQ2LK",
  lab: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
  instAdmin: "NBSWY3DPNBSWY3DPNBSWY3DPNBSWY3DP",
};

// Same envelope as src/lib/crypto.ts (version 1 | iv | tag | ciphertext).
function encrypt(plain: Buffer, aad: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", KEY, iv);
  c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([Buffer.from([1]), iv, c.getAuthTag(), ct]);
}
const sealTotp = (secret: string, userId: string) => encrypt(Buffer.from(secret), `mfa:${userId}`).toString("base64");

function syntheticPdf(title: string, lines: string[]) {
  const text = [title, "SYNTHETIC DEMONSTRATION DOCUMENT - NOT A REAL PATIENT", "", ...lines]
    .map((l, i) => `BT /F1 ${i === 0 ? 16 : 11} Tf 56 ${760 - i * 22} Td (${l.replace(/[()\\]/g, "")}) Tj ET`).join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, "latin1");
}

function storeFile(ownerId: string, buf: Buffer, scope: "records" | "institutions" = "records") {
  const key = `${scope}/${ownerId}/${crypto.randomUUID()}`;
  const path = join(process.cwd(), STORAGE, `${key}.enc`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encrypt(buf, key));
  return { storage_key: key, size_bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex") };
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

async function main() {
  const sql = adminClient(adminUrl);
  const app = postgres(appUrl, { max: 2, onnotice: () => {} });
  const [{ n }] = await sql`select count(*)::int n from users where email like '%@demo.continuum.test'`;
  if (n > 0) { console.log("Demo data already present. Run `npm run db:reset` to start over."); await sql.end(); await app.end(); return; }

  const pw = await hash(DEMO_PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const user = async (email: string, name: string, phone: string | null, totp?: string) => {
    const id = await createUser(sql, { email, name, phone, passwordHash: pw });
    if (totp) await sql`update users set mfa_enabled = true, mfa_secret_enc = ${sealTotp(totp, id)}, mfa_enrolled_at = now() where id = ${id}`;
    return id;
  };

  // ── Platform staff ────────────────────────────────────────────────────────
  const admin = await user("admin@demo.continuum.test", "Tolu Administrator", "+2348000000101", DEMO_TOTP.admin);
  await grantPlatformRole(sql, admin, "platform_admin");
  await grantPlatformRole(sql, admin, "security_officer");
  await grantPlatformRole(sql, admin, "support_agent");

  // ── Institutions ──────────────────────────────────────────────────────────
  const owner = await user("owner.ikeja@demo.continuum.test", "Ronke Balogun", "+2348000000201", DEMO_TOTP.instAdmin);
  const ikeja = await createInstitution(sql, { name: "Ikeja Specialist Hospital (Demo)", createdBy: owner, city: "Ikeja", state: "Lagos" });
  const lagosIsland = await createInstitution(sql, { name: "Lagos Island General Hospital (Demo)", city: "Lagos Island", state: "Lagos" });
  const lab = await createInstitution(sql, { name: "Meridian Diagnostics Laboratory (Demo)", type: "laboratory", city: "Surulere", state: "Lagos" });
  const abuja = await createInstitution(sql, { name: "Harmony Family Clinic, Abuja (Demo)", type: "clinic", status: "submitted", city: "Wuse", state: "FCT" });
  const enugu = await createInstitution(sql, { name: "Coal City Medical Centre (Demo)", status: "under_review", city: "Enugu", state: "Enugu" });
  for (const inst of [abuja, enugu]) {
    const f = storeFile(inst, syntheticPdf("Operating licence (SYNTHETIC)", ["Issued by: State Ministry of Health (synthetic)", "This document is fictional demo data."]), "institutions");
    await sql`insert into institution_documents(institution_id, document_type, storage_key, file_name, mime_type, size_bytes, sha256, uploaded_by)
              select ${inst}, 'operating_license', ${f.storage_key}, 'operating-licence.pdf', 'application/pdf', ${f.size_bytes}, ${f.sha256}, created_by
              from healthcare_institutions where id = ${inst}`;
  }

  // ── Professionals ─────────────────────────────────────────────────────────
  const ownerPro = await createProfessional(sql, { userId: owner, fullName: "Ronke Balogun", profession: "administrator" });
  await affiliate(sql, ownerPro.professionalId, ikeja, "institution_admin");
  const chidiU = await user("dr.eze@demo.continuum.test", "Chidi Eze", "+2348000000301", DEMO_TOTP.clinician);
  const chidi = await createProfessional(sql, { userId: chidiU, fullName: "Dr Chidi Eze" });
  await affiliate(sql, chidi.professionalId, ikeja, "clinician");
  const funmiU = await user("dr.adeyemi@demo.continuum.test", "Funmilayo Adeyemi", "+2348000000302", DEMO_TOTP.clinician2);
  const funmi = await createProfessional(sql, { userId: funmiU, fullName: "Dr Funmilayo Adeyemi" });
  await affiliate(sql, funmi.professionalId, lagosIsland, "clinician");
  const bisiU = await user("lab.ogun@demo.continuum.test", "Bisi Ogun", "+2348000000303", DEMO_TOTP.lab);
  const bisi = await createProfessional(sql, { userId: bisiU, fullName: "Bisi Ogun", profession: "medical_lab_scientist", licenseBody: "MLSCN" });
  await affiliate(sql, bisi.professionalId, lab, "lab_scientist");
  const nurseU = await user("nurse.ibrahim@demo.continuum.test", "Aisha Ibrahim", "+2348000000304", DEMO_TOTP.clinician);
  const nurse = await createProfessional(sql, { userId: nurseU, fullName: "Nurse Aisha Ibrahim", profession: "nurse_midwife", licenseBody: "NMCN", verified: false });
  await affiliate(sql, nurse.professionalId, ikeja, "clinician");

  // ── Patients ──────────────────────────────────────────────────────────────
  const adaU = await user("adaeze@demo.continuum.test", "Adaeze", "+2348030000001");
  const ada = await createPatient(sql, { userId: adaU, fullName: "Adaeze Okafor", dob: "1986-03-14", sex: "female", phone: "+2348030000001" });
  await sql`update patient_profiles set state_of_residence = 'Lagos', lga = 'Ikeja', emergency_contact_name = 'Obinna Okafor',
            emergency_contact_phone = '+2348030000009', emergency_contact_relationship = 'Brother' where patient_id = ${ada.patientId}`;
  await sql`insert into health_identifiers(patient_id, identifier_type, value_hash, display_hint)
            values (${ada.patientId}, 'nin', encode(digest('synthetic-ada-nin', 'sha256'), 'hex'), '4821')`;
  const emekaU = await user("emeka@demo.continuum.test", "Emeka", "+2348030000002");
  const emeka = await createPatient(sql, { userId: emekaU, fullName: "Emeka Nwosu", dob: "1972-09-30", sex: "male", phone: "+2348030000002" });
  const halimaU = await user("halima@demo.continuum.test", "Halima", "+2348030000003");
  const halima = await createPatient(sql, { userId: halimaU, fullName: "Halima Bello", dob: "1995-01-22", sex: "female", phone: "+2348030000003", verified: false });
  await sql`update patients set verification_status = 'pending', verified_at = null where id = ${halima.patientId}`;
  await sql`insert into identity_verifications(user_id, patient_id, provider, method, status, provider_reference)
            values (${halimaU}, ${halima.patientId}, 'manual_review', 'in_person', 'pending', 'Prefers verification at Lagos Island General')`;
  // A minor whose mother is the verified representative.
  const tobi = await createPatient(sql, { userId: null, fullName: "Tobi Okafor", dob: "2017-06-05", sex: "male" });
  await sql`insert into patient_representatives(patient_id, representative_user_id, relationship, status, legal_basis_note, verified_at, verified_by)
            values (${tobi.patientId}, ${adaU}, 'parent', 'active', 'Synthetic: birth certificate checked', now(), ${admin})`;

  // ── Clinical history, submitted through the real workflow ────────────────
  const submit = (userId: string, inst: string, patient: string, r: { category: string; title: string; description: string; date: string; structured?: unknown }, file?: Buffer) =>
    as(app, userId, async (tx) => {
      const att = file ? [{ ...storeFile(patient, file), file_name: `${r.title.replace(/\W+/g, "-").toLowerCase()}.pdf`, mime_type: "application/pdf", scan_status: "clean", scan_detail: "Seeded synthetic file" }] : [];
      const [row] = await tx`select app.submit_clinical_record(${inst}, ${patient}, ${r.category}, ${r.title}, ${r.description}, ${r.date}::date,
        ${r.structured ? tx.json(r.structured as never) : null}::jsonb, true, ${r.date}::date, ${tx.json(att as never)}::jsonb) as id`;
      return row.id as string;
    });

  await submit(funmiU, lagosIsland, ada.patientId, { category: "consultation", title: "General outpatient review", date: daysAgo(420),
    description: "Presented with recurrent headaches. Blood pressure 152/96 mmHg on two readings. Advised lifestyle changes; review in 4 weeks." });
  await submit(funmiU, lagosIsland, ada.patientId, { category: "diagnosis", title: "Essential (primary) hypertension", date: daysAgo(390),
    description: "Stage 1 hypertension confirmed after repeat readings. ICD-10 I10." });
  await submit(funmiU, lagosIsland, ada.patientId, { category: "prescription", title: "Amlodipine 5 mg", date: daysAgo(390),
    description: "Start amlodipine. Review in 6 weeks.", structured: { medications: [{ name: "Amlodipine", dose: "5 mg", frequency: "Once daily", duration: "Ongoing" }] } });
  await submit(bisiU, lab, ada.patientId, { category: "lab_result", title: "Lipid profile", date: daysAgo(200), description: "Fasting sample.",
    structured: { results: [
      { test: "Total cholesterol", value: 5.9, unit: "mmol/L", reference: "< 5.2", flag: "high" },
      { test: "LDL cholesterol", value: 3.8, unit: "mmol/L", reference: "< 3.4", flag: "high" },
      { test: "HDL cholesterol", value: 1.3, unit: "mmol/L", reference: "> 1.0", flag: "normal" },
      { test: "Triglycerides", value: 1.6, unit: "mmol/L", reference: "< 1.7", flag: "normal" }] } },
    syntheticPdf("Meridian Diagnostics - Lipid profile", ["Patient: Adaeze Okafor (synthetic)", "Total cholesterol 5.9 mmol/L (H)", "LDL 3.8 mmol/L (H)", "HDL 1.3 mmol/L", "TG 1.6 mmol/L"]));
  await submit(bisiU, lab, ada.patientId, { category: "lab_result", title: "Full blood count", date: daysAgo(35), description: "Routine.",
    structured: { results: [{ test: "Haemoglobin", value: 12.8, unit: "g/dL", reference: "12.0–15.5", flag: "normal" }, { test: "White cell count", value: 6.1, unit: "×10⁹/L", reference: "4.0–11.0", flag: "normal" }, { test: "Platelets", value: 265, unit: "×10⁹/L", reference: "150–400", flag: "normal" }] } });
  await submit(funmiU, lagosIsland, ada.patientId, { category: "allergy", title: "Penicillin allergy", date: daysAgo(1400), description: "Urticarial rash after amoxicillin in 2021. Avoid penicillins." });
  await submit(funmiU, lagosIsland, ada.patientId, { category: "vaccination", title: "Hepatitis B vaccine — dose 3", date: daysAgo(700), description: "Course complete." });
  await submit(funmiU, lagosIsland, ada.patientId, { category: "admission", title: "Admission — acute gastroenteritis", date: daysAgo(160), description: "Admitted for IV fluids. 2 nights on female medical ward." });
  await submit(funmiU, lagosIsland, ada.patientId, { category: "discharge_summary", title: "Discharge summary", date: daysAgo(158), description: "Rehydrated, tolerating oral intake. Discharged with ORS. No follow-up needed." },
    syntheticPdf("Lagos Island General Hospital - Discharge summary", ["Patient: Adaeze Okafor (synthetic)", "Diagnosis: acute gastroenteritis", "Discharged home, stable."]));
  await submit(chidiU, ikeja, emeka.patientId, { category: "diagnosis", title: "Type 2 diabetes mellitus", date: daysAgo(900), description: "HbA1c 8.1%. ICD-10 E11." });
  await submit(chidiU, ikeja, emeka.patientId, { category: "prescription", title: "Metformin 500 mg", date: daysAgo(890), description: "Twice daily with meals.",
    structured: { medications: [{ name: "Metformin", dose: "500 mg", frequency: "Twice daily", duration: "Ongoing" }] } });
  await submit(funmiU, lagosIsland, tobi.patientId, { category: "vaccination", title: "Measles-rubella vaccine", date: daysAgo(1800), description: "Routine childhood immunisation." });

  // Patient upload (clearly labelled as patient-provided).
  const scan = syntheticPdf("Chest X-ray report (paper copy)", ["St. Anne's Clinic, Onitsha - 2019", "No active lung disease.", "Uploaded by the patient."]);
  const f = storeFile(ada.patientId, scan);
  await as(app, adaU, (tx) => tx`select app.patient_create_upload(${ada.patientId}, 'imaging', 'Chest X-ray report (2019)', '2019-08-12'::date,
    'St. Anne''s Clinic, Onitsha', 'Old paper report I photographed.', ${f.storage_key}, 'chest-xray-2019.pdf', 'application/pdf', ${f.size_bytes},
    ${f.sha256}, 'clean', 'Seeded synthetic file')`);

  // ── Access workflow ───────────────────────────────────────────────────────
  const request = (userId: string, inst: string, patient: string, cats: string[], days: number, purpose = "referral",
    detail = "Referred for blood pressure and cholesterol review; need recent results and current medicines.") =>
    as(app, userId, async (tx) => (await tx`select app.create_access_request(${inst}, ${patient}, ${purpose}::access_purpose, ${detail},
      ${cats}::text[], null, null, ${days}) as id`)[0].id as string);

  // Lagos Island: approved, active (ongoing care).
  const r1 = await request(funmiU, lagosIsland, ada.patientId, ["consultation", "diagnosis", "prescription", "lab_result", "allergy"], 90, "ongoing_care",
    "Continuing hypertension management; reviewing medicines and lab trends.");
  const p1 = await as(app, adaU, async (tx) => (await tx`select app.decide_access_request(${r1}, 'approve') as id`)[0].id as string);
  await as(app, funmiU, (tx) => tx`select app.provider_list_records(${lagosIsland}, ${ada.patientId})`);
  await as(app, funmiU, async (tx) => {
    const recs = await tx`select id from app.provider_list_records(${lagosIsland}, ${ada.patientId}) limit 2`;
    for (const r of recs) await tx`select app.provider_get_record(${lagosIsland}, ${r.id})`;
  });
  void p1;

  // Meridian lab: approved then revoked by the patient.
  const r2 = await request(bisiU, lab, ada.patientId, ["lab_result"], 14, "diagnostic_review", "Comparing new results with previous lipid profile.");
  const p2 = await as(app, adaU, async (tx) => (await tx`select app.decide_access_request(${r2}, 'approve') as id`)[0].id as string);
  await as(app, adaU, (tx) => tx`select app.revoke_permission(${p2}, 'Review finished')`);

  // Ikeja: a PENDING request waiting for Adaeze — the core demo moment.
  await request(chidiU, ikeja, ada.patientId, ["lab_result", "prescription", "diagnosis", "allergy"], 30, "specialist_consultation",
    "Cardiology referral for persistently raised blood pressure. I need your recent blood tests, current medicines and allergies before your appointment.");

  // Emeka granted Ikeja access long ago — now expired.
  const r3 = await request(chidiU, ikeja, emeka.patientId, ["diagnosis", "prescription"], 7, "follow_up", "Diabetes follow-up review of medicines.");
  const p3 = await as(app, emekaU, async (tx) => (await tx`select app.decide_access_request(${r3}, 'approve') as id`)[0].id as string);
  await sql`update permissions set granted_at = now() - interval '40 days', valid_from = now() - interval '40 days', expires_at = now() - interval '33 days' where id = ${p3}`;
  await sql`select app.run_expiry()`;

  // A blocked attempt so the activity history shows denials.
  await as(app, nurseU, (tx) => tx`select app.provider_list_records(${ikeja}, ${ada.patientId})`);

  // Support & security examples.
  await as(app, halimaU, (tx) => tx`select app.create_support_ticket('identity_verification', 'Help verifying my identity',
    'I do not have my NIN slip with me. Can I verify at Lagos Island General Hospital?', null, null)`);

  await sql.end();
  await app.end();
  console.log(`
Synthetic demo data created. Password for every demo account: ${DEMO_PASSWORD}

  Patient (verified, rich history)  adaeze@demo.continuum.test     — also guardian of a minor (Tobi)
  Patient (verified)                emeka@demo.continuum.test
  Patient (identity pending)        halima@demo.continuum.test
  Clinician, Ikeja Specialist       dr.eze@demo.continuum.test      TOTP ${DEMO_TOTP.clinician}
  Clinician, Lagos Island General   dr.adeyemi@demo.continuum.test  TOTP ${DEMO_TOTP.clinician2}
  Lab scientist, Meridian           lab.ogun@demo.continuum.test    TOTP ${DEMO_TOTP.lab}
  Institution admin, Ikeja          owner.ikeja@demo.continuum.test TOTP ${DEMO_TOTP.instAdmin}
  Nurse (licence pending)           nurse.ibrahim@demo.continuum.test TOTP ${DEMO_TOTP.clinician}
  Platform admin + security         admin@demo.continuum.test       TOTP ${DEMO_TOTP.admin}

Staff accounts require an authenticator code: add the TOTP secret to any authenticator app.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
