import { beforeAll, describe, expect, it } from "vitest";
import { admin, app, expectCode } from "./helpers";
import { as, createClinician, createPatient, createRecord, createUser, grantPlatformRole } from "../scripts/fixtures";

describe("emergency access (break-glass)", () => {
  let patient: Awaited<ReturnType<typeof createPatient>>;
  let doc: Awaited<ReturnType<typeof createClinician>>;
  let allergy: string;
  let lab: string;
  let officer: string;
  const justification = "Patient brought in unconscious after road traffic accident; need allergies and current medication.";

  beforeAll(async () => {
    patient = await createPatient(admin, { fullName: "Emeka Nwosu" });
    doc = await createClinician(admin, { fullName: "Dr Emergency" });
    const other = await createClinician(admin);
    allergy = await createRecord(admin, { patientId: patient.patientId, category: "allergy", title: "Penicillin allergy",
      institutionId: other.institutionId, professionalId: other.professionalId, submittedBy: other.userId });
    lab = await createRecord(admin, { patientId: patient.patientId, category: "lab_result", title: "HIV test",
      institutionId: other.institutionId, professionalId: other.professionalId, submittedBy: other.userId });
    officer = await createUser(admin);
    await grantPlatformRole(admin, officer, "security_officer");
  });

  it("requires a real justification and limits scope to minimum-necessary categories", async () => {
    await expectCode(as(app, doc.userId, (tx) => tx`select app.emergency_access(${doc.institutionId}, ${patient.patientId}, 'urgent', array['allergy']::text[])`), "NP400");
    await expectCode(as(app, doc.userId, (tx) => tx`select app.emergency_access(${doc.institutionId}, ${patient.patientId}, ${justification}, array['lab_result']::text[])`), "NP400");
    const [{ id }] = await as(app, doc.userId, (tx) => tx`select app.emergency_access(${doc.institutionId}, ${patient.patientId}, ${justification}, array['allergy','lab_result']::text[]) as id`);
    const get = (rec: string) => as(app, doc.userId, async (tx) => (await tx`select app.provider_get_record(${doc.institutionId}, ${rec}) as r`)[0].r);
    expect((await get(allergy)).allowed).toBe(true);
    expect((await get(lab)).allowed).toBe(false); // lab results are outside the emergency allow-list
    const [p] = await admin`select authorization_basis, review_status, expires_at <= now() + interval '12 hours 1 minute' as short from permissions where id = ${id}`;
    expect(p).toMatchObject({ authorization_basis: "emergency_access", review_status: "pending_review", short: true });
    const [inc] = await admin`select count(*)::int n from security_incidents where category = 'emergency_access_review' and related_patient_id = ${patient.patientId}`;
    expect(inc.n).toBe(1);
    const [crit] = await admin`select security_critical from notifications where user_id = ${patient.userId} and type = 'emergency_access'`;
    expect(crit.security_critical).toBe(true);
    // Patients cannot "revoke" a non-consent basis, but security review can end it.
    await expectCode(as(app, patient.userId, (tx) => tx`select app.revoke_permission(${id}, null)`), "NP409");
    await as(app, officer, (tx) => tx`select app.admin_review_emergency(${id}, 'inappropriate', 'Justification not supported by triage notes.')`);
    expect((await get(allergy)).allowed).toBe(false);
  });

  it("non-clinical roles cannot break glass", async () => {
    const recOfficer = await createClinician(admin, { institutionId: doc.institutionId, roleKey: "records_officer" });
    const [{ id }] = await as(app, recOfficer.userId, (tx) => tx`select app.emergency_access(${doc.institutionId}, ${patient.patientId}, ${justification}, array['allergy']::text[]) as id`);
    expect(id).toBeNull();
  });
});

describe("audit integrity", () => {
  it("audit and access logs are append-only, even for the service role", async () => {
    await admin`select app.audit('test.event', 'test', '1')`;
    await expectCode(admin`update audit_logs set action = 'tampered'`, "42501");
    await expectCode(admin`delete from audit_logs`, "42501");
    await expectCode(admin`delete from access_events`, "42501");
    await expectCode(admin`truncate audit_logs`, "42501");
    await expectCode(app.begin(async (tx) => { await tx`select set_config('role','service_role',true)`; await tx`update audit_logs set action='x'`; }), "42501");
  });

  it("the hash chain verifies, and detects tampering by someone who bypasses triggers", async () => {
    const officer = await createUser(admin);
    await grantPlatformRole(admin, officer, "security_officer");
    const verify = () => as(app, officer, async (tx) => (await tx`select * from app.verify_audit_chain()`)[0]);
    expect((await verify()).valid).toBe(true);
    // Simulate a privileged attacker editing a row with triggers disabled.
    await admin.begin(async (tx) => {
      await tx`alter table audit_logs disable trigger audit_logs_append_only`;
      await tx`update audit_logs set metadata = '{"edited":true}' where chain_seq = 1`;
      await tx`alter table audit_logs enable trigger audit_logs_append_only`;
    });
    const res = await verify();
    expect(res.valid).toBe(false);
    expect(Number(res.first_broken_seq)).toBe(1);
  });

  it("non-staff cannot run the chain verification", async () => {
    const p = await createPatient(admin);
    await expectCode(as(app, p.userId, (tx) => tx`select * from app.verify_audit_chain()`), "42501");
  });
});

describe("automated anomaly detection", () => {
  it("repeated denials open a security incident", async () => {
    const snoop = await createClinician(admin, { fullName: "Dr Curious" });
    const victim = await createPatient(admin);
    const rec = await createRecord(admin, { patientId: victim.patientId, submittedBy: victim.userId! });
    for (let i = 0; i < 6; i++) {
      await as(app, snoop.userId, (tx) => tx`select app.provider_get_record(${snoop.institutionId}, ${rec})`);
    }
    const [inc] = await admin`select count(*)::int n from security_incidents where related_user_id = ${snoop.userId} and category = 'repeated_denials'`;
    expect(inc.n).toBe(1);
  });
});
