/**
 * Authorization & RLS tests. Every assertion runs real SQL as a real actor
 * (role `authenticated` + JWT claims), exactly as the application does.
 * Numbers in test names refer to the testing requirements in the brief.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { admin, app, expectCode, accessEvents } from "./helpers";
import {
  as, createAttachment, createClinician, createInstitution, createPatient, createRecord, createUser, grantPlatformRole,
  affiliate, createProfessional,
} from "../scripts/fixtures";

type Ctx = Awaited<ReturnType<typeof world>>;

/** A small, realistic world: two patients, two hospitals, a lab, an admin. */
async function world() {
  const ada = await createPatient(admin, { fullName: "Adaeze Okafor", dob: "1988-03-14", phone: "+2348031110001" });
  const bayo = await createPatient(admin, { fullName: "Adebayo Lawal", dob: "1979-11-02", phone: "+2348031110002" });
  const lagos = await createClinician(admin, { fullName: "Dr Chidi Eze" });
  const abuja = await createClinician(admin, { fullName: "Dr Fatima Bello" });
  const colleague = await createClinician(admin, { institutionId: lagos.institutionId, fullName: "Dr Ngozi Obi" });

  const adaLab = await createRecord(admin, { patientId: ada.patientId, category: "lab_result", title: "Lipid profile",
    clinicalDate: "2025-03-10", institutionId: abuja.institutionId, professionalId: abuja.professionalId, submittedBy: abuja.userId });
  const adaRx = await createRecord(admin, { patientId: ada.patientId, category: "prescription", title: "Amlodipine 5mg",
    clinicalDate: "2025-03-10", institutionId: abuja.institutionId, professionalId: abuja.professionalId, submittedBy: abuja.userId });
  const adaOldLab = await createRecord(admin, { patientId: ada.patientId, category: "lab_result", title: "Malaria parasite test",
    clinicalDate: "2019-01-20", institutionId: abuja.institutionId, professionalId: abuja.professionalId, submittedBy: abuja.userId });
  const adaUpload = await createRecord(admin, { patientId: ada.patientId, category: "imaging", title: "Chest X-ray (scan)",
    clinicalDate: "2024-07-01", submittedBy: ada.userId! });
  const adaLabFile = await createAttachment(admin, adaLab, abuja.userId);
  const bayoRecord = await createRecord(admin, { patientId: bayo.patientId, category: "diagnosis", title: "Type 2 diabetes",
    institutionId: abuja.institutionId, professionalId: abuja.professionalId, submittedBy: abuja.userId });

  const adminUser = await createUser(admin, { name: "Platform Admin" });
  await grantPlatformRole(admin, adminUser, "platform_admin");
  await grantPlatformRole(admin, adminUser, "security_officer");

  return { ada, bayo, lagos, abuja, colleague, adaLab, adaRx, adaOldLab, adaUpload, adaLabFile, bayoRecord, adminUser };
}

async function requestAccess(w: Ctx, o: { categories?: string[]; days?: number; from?: string | null; to?: string | null } = {}) {
  return as(app, w.lagos.userId, async (tx) => {
    const [r] = await tx`select app.create_access_request(${w.lagos.institutionId}, ${w.ada.patientId}, 'referral',
      'Referred for hypertension review', ${o.categories ?? ["lab_result", "prescription"]}::text[],
      ${o.from ?? null}::date, ${o.to ?? null}::date, ${o.days ?? 30}) as id`;
    return r.id as string;
  });
}

const approve = (w: Ctx, requestId: string, userId = w.ada.userId!) =>
  as(app, userId, async (tx) => (await tx`select app.decide_access_request(${requestId}, 'approve') as id`)[0].id as string);

const providerRecords = (userId: string, institutionId: string, patientId: string) =>
  as(app, userId, (tx) => tx`select id, title, category_key from app.provider_list_records(${institutionId}, ${patientId})`);

const providerGet = (userId: string, institutionId: string, recordId: string) =>
  as(app, userId, async (tx) => (await tx`select app.provider_get_record(${institutionId}, ${recordId}) as r`)[0].r);

describe("authorization", () => {
  let w: Ctx;
  beforeAll(async () => { w = await world(); });

  it("1. a patient cannot view another patient's records (RLS)", async () => {
    const own = await as(app, w.ada.userId, (tx) => tx`select id from medical_records`);
    expect(own.map((r) => r.id).sort()).toEqual([w.adaLab, w.adaRx, w.adaOldLab, w.adaUpload].sort());

    const other = await as(app, w.bayo.userId, (tx) => tx`select id from medical_records where patient_id = ${w.ada.patientId}`);
    expect(other).toHaveLength(0);
    const att = await as(app, w.bayo.userId, (tx) => tx`select id from medical_record_attachments where id = ${w.adaLabFile}`);
    expect(att).toHaveLength(0);
    const profile = await as(app, w.bayo.userId, (tx) => tx`select * from patient_profiles where patient_id = ${w.ada.patientId}`);
    expect(profile).toHaveLength(0);
    // Download path also refuses.
    const dl = await as(app, w.bayo.userId, async (tx) => (await tx`select app.authorize_attachment(${w.adaLabFile}, null) as r`)[0].r);
    expect(dl.allowed).toBe(false);
  });

  it("2 & BR-004. finding a patient does not grant access", async () => {
    const found = await as(app, w.lagos.userId, (tx) =>
      tx`select * from app.search_patients(${w.lagos.institutionId}, ${w.ada.healthId}, null, null, null)`);
    expect(found).toHaveLength(1);
    expect(found[0].masked_name).toBe("Adaeze O.");
    expect(Object.keys(found[0])).not.toContain("full_name");

    expect(await providerRecords(w.lagos.userId, w.lagos.institutionId, w.ada.patientId)).toHaveLength(0);
    const r = await providerGet(w.lagos.userId, w.lagos.institutionId, w.adaLab);
    expect(r).toEqual({ allowed: false, reason: "outside_permission_scope" });
    const overview = await as(app, w.lagos.userId, async (tx) =>
      (await tx`select app.provider_patient_overview(${w.lagos.institutionId}, ${w.ada.patientId}) as r`)[0].r);
    expect(overview.allowed).toBe(false);
    // Providers have no direct RLS path to clinical tables at all.
    expect(await as(app, w.lagos.userId, (tx) => tx`select id from medical_records`)).toHaveLength(0);
  });

  it("search never matches unverified patients and only exact identifiers", async () => {
    const unverified = await createPatient(admin, { fullName: "Unverified Person", verified: false, phone: "+2348031119999" });
    const r1 = await as(app, w.lagos.userId, (tx) =>
      tx`select * from app.search_patients(${w.lagos.institutionId}, ${unverified.healthId}, null, null, null)`);
    expect(r1).toHaveLength(0);
    const r2 = await as(app, w.lagos.userId, (tx) =>
      tx`select * from app.search_patients(${w.lagos.institutionId}, null, '+2348031110001', '1988-03-15'::date, null)`);
    expect(r2).toHaveLength(0); // wrong date of birth
    const r3 = await as(app, w.lagos.userId, (tx) =>
      tx`select * from app.search_patients(${w.lagos.institutionId}, null, '+2348031110001', '1988-03-14'::date, null)`);
    expect(r3).toHaveLength(1);
  });

  it("E2E core: approve → scoped access; 6. expired permission; 7. revoked permission", async () => {
    const reqId = await requestAccess(w, { from: "2024-01-01" });
    // 5-ish: pending request grants nothing
    expect(await providerRecords(w.lagos.userId, w.lagos.institutionId, w.ada.patientId)).toHaveLength(0);

    const permId = await approve(w, reqId);
    const visible = await providerRecords(w.lagos.userId, w.lagos.institutionId, w.ada.patientId);
    // Scope: lab + prescription only, from 2024 → excludes 2019 lab and the imaging upload.
    expect(visible.map((r) => r.id).sort()).toEqual([w.adaLab, w.adaRx].sort());
    expect((await providerGet(w.lagos.userId, w.lagos.institutionId, w.adaOldLab)).allowed).toBe(false);
    expect((await providerGet(w.lagos.userId, w.lagos.institutionId, w.adaUpload)).allowed).toBe(false);
    expect((await providerGet(w.lagos.userId, w.lagos.institutionId, w.adaLab)).allowed).toBe(true);
    // A colleague at the same institution is covered by an institution-level grant.
    expect((await providerGet(w.colleague.userId, w.lagos.institutionId, w.adaLab)).allowed).toBe(true);

    // 6. Expiry is enforced at read time even if the status column still says active.
    await admin`update permissions set valid_from = now() - interval '2 days', expires_at = now() - interval '1 second' where id = ${permId}`;
    expect((await providerGet(w.lagos.userId, w.lagos.institutionId, w.adaLab)).allowed).toBe(false);
    expect(await providerRecords(w.lagos.userId, w.lagos.institutionId, w.ada.patientId)).toHaveLength(0);
    const [{ r: job }] = await admin`select app.run_expiry() as r`;
    expect(job.permissions_expired).toBeGreaterThanOrEqual(1);
    const [p] = await admin`select status from permissions where id = ${permId}`;
    expect(p.status).toBe("expired");

    // 7. Revocation ends access immediately.
    const req2 = await requestAccess(w);
    const perm2 = await approve(w, req2);
    expect((await providerGet(w.lagos.userId, w.lagos.institutionId, w.adaRx)).allowed).toBe(true);
    await as(app, w.ada.userId, (tx) => tx`select app.revoke_permission(${perm2}, 'No longer seeing this hospital')`);
    expect((await providerGet(w.lagos.userId, w.lagos.institutionId, w.adaRx)).allowed).toBe(false);
    await expectCode(as(app, w.ada.userId, (tx) => tx`select app.revoke_permission(${perm2}, null)`), "NP409");
    const [n] = await admin`select count(*)::int n from notifications where type = 'permission_revoked'`;
    expect(n.n).toBeGreaterThan(0);
  });

  it("partial approval narrows categories, records and duration; the patient cannot widen scope", async () => {
    const reqId = await requestAccess(w, { days: 60 });
    await expectCode(as(app, w.ada.userId, (tx) =>
      tx`select app.decide_access_request(${reqId}, 'partial', array['lab_result','imaging']::text[])`), "NP400");
    const permId = await as(app, w.ada.userId, async (tx) => (await tx`
      select app.decide_access_request(${reqId}, 'partial', array['lab_result']::text[], array[${w.adaLab}]::uuid[],
                                       null, null, 7, true, null) as id`)[0].id);
    const [perm] = await admin`select professional_id, expires_at - granted_at as span from permissions where id = ${permId}`;
    expect(perm.professional_id).toBe(w.lagos.professionalId);
    const [req] = await admin`select status from access_requests where id = ${reqId}`;
    expect(req.status).toBe("partially_approved");

    expect((await providerGet(w.lagos.userId, w.lagos.institutionId, w.adaLab)).allowed).toBe(true);
    // Same category but not the selected record:
    expect((await providerGet(w.lagos.userId, w.lagos.institutionId, w.adaOldLab)).allowed).toBe(false);
    expect((await providerGet(w.lagos.userId, w.lagos.institutionId, w.adaRx)).allowed).toBe(false);
    // Restricted to the requester — the colleague is excluded:
    expect((await providerGet(w.colleague.userId, w.lagos.institutionId, w.adaLab)).allowed).toBe(false);
    await as(app, w.ada.userId, (tx) => tx`select app.revoke_permission(${permId}, null)`);
  });

  it("3. a professional cannot use another institution's authorization", async () => {
    const reqId = await requestAccess(w);
    const permId = await approve(w, reqId);
    // Abuja professional tries to act as Lagos:
    const asLagos = await providerGet(w.abuja.userId, w.lagos.institutionId, w.adaLab);
    expect(asLagos).toEqual({ allowed: false, reason: "no_affiliation" });
    // …and as their own institution, which holds no permission:
    const r = await as(app, w.abuja.userId, (tx) => tx`select * from app.provider_list_records(${w.abuja.institutionId}, ${w.ada.patientId})`);
    expect(r).toHaveLength(0);
    await as(app, w.ada.userId, (tx) => tx`select app.revoke_permission(${permId}, null)`);
  });

  it("4. a rejected request grants no access and cannot be re-decided", async () => {
    const reqId = await requestAccess(w);
    const res = await as(app, w.ada.userId, async (tx) => (await tx`select app.decide_access_request(${reqId}, 'reject') as id`)[0].id);
    expect(res).toBeNull();
    expect(await providerRecords(w.lagos.userId, w.lagos.institutionId, w.ada.patientId)).toHaveLength(0);
    await expectCode(approve(w, reqId), "NP409");
    const [n] = await admin`select count(*)::int n from permissions where access_request_id = ${reqId}`;
    expect(n.n).toBe(0);
  });

  it("5. an expired (unanswered) request grants no access", async () => {
    const reqId = await requestAccess(w);
    await admin`update access_requests set respond_by = now() - interval '1 minute' where id = ${reqId}`;
    await expectCode(approve(w, reqId), "NP409");
    expect(await providerRecords(w.lagos.userId, w.lagos.institutionId, w.ada.patientId)).toHaveLength(0);
    await admin`select app.run_expiry()`;
    const [r] = await admin`select status from access_requests where id = ${reqId}`;
    expect(r.status).toBe("expired");
  });

  it("only one pending request per institution and patient", async () => {
    const reqId = await requestAccess(w);
    await expectCode(requestAccess(w), "NP409");
    await as(app, w.lagos.userId, (tx) => tx`select app.cancel_access_request(${reqId})`);
  });

  it("8. a patient cannot decide for another patient without a verified representative relationship", async () => {
    const reqId = await requestAccess(w);
    await expectCode(approve(w, reqId, w.bayo.userId!), "NP403");
    // Pending (unverified) representative is not enough:
    const guardian = await createUser(admin, { name: "Guardian" });
    await admin`insert into patient_representatives(patient_id, representative_user_id, relationship, status)
                values (${w.ada.patientId}, ${guardian}, 'legal_guardian', 'pending_verification')`;
    await expectCode(approve(w, reqId, guardian), "NP403");
    // Verified representative may decide, and the basis is recorded as representative consent.
    await admin`update patient_representatives set status = 'active' where representative_user_id = ${guardian}`;
    const permId = await approve(w, reqId, guardian);
    const [p] = await admin`select authorization_basis, consent_version_id from permissions where id = ${permId}`;
    expect(p.authorization_basis).toBe("representative_consent");
    expect(p.consent_version_id).not.toBeNull();
    await as(app, guardian, (tx) => tx`select app.revoke_permission(${permId}, null)`);
    // An expired representative relationship loses authority.
    await admin`update patient_representatives set valid_until = now() - interval '1 day' where representative_user_id = ${guardian}`;
    const visible = await as(app, guardian, (tx) => tx`select id from medical_records`);
    expect(visible).toHaveLength(0);
  });

  it("9. an unverified or suspended institution cannot use provider functions", async () => {
    const pendingInst = await createInstitution(admin, { status: "submitted" });
    const doc = await createProfessional(admin, {});
    await affiliate(admin, doc.professionalId, pendingInst, "clinician");
    const search = await as(app, doc.userId, (tx) => tx`select * from app.search_patients(${pendingInst}, ${w.ada.healthId}, null, null, null)`);
    expect(search).toHaveLength(0);
    const [ev] = await admin`select denial_reason from access_events where actor_user_id = ${doc.userId} order by id desc limit 1`;
    expect(ev.denial_reason).toBe("institution_not_approved");
    await expectCode(as(app, doc.userId, (tx) => tx`select app.create_access_request(${pendingInst}, ${w.ada.patientId}, 'referral',
      'Referral for review', array['lab_result']::text[], null, null, 7)`), "NP403");

    // Suspension pauses existing permissions and blocks reads.
    const reqId = await requestAccess(w);
    const permId = await approve(w, reqId);
    await as(app, w.adminUser, (tx) => tx`select app.admin_set_institution_status(${w.lagos.institutionId}, 'suspended', 'Licence under investigation')`);
    expect((await providerGet(w.lagos.userId, w.lagos.institutionId, w.adaLab)).allowed).toBe(false);
    const [p] = await admin`select status from permissions where id = ${permId}`;
    expect(p.status).toBe("suspended");
    // Reinstatement restores unexpired permissions that were paused by the suspension.
    await as(app, w.adminUser, (tx) => tx`select app.admin_set_institution_status(${w.lagos.institutionId}, 'approved', null)`);
    expect((await providerGet(w.lagos.userId, w.lagos.institutionId, w.adaLab)).allowed).toBe(true);
    await as(app, w.ada.userId, (tx) => tx`select app.revoke_permission(${permId}, null)`);
  });

  it("10. unauthorised staff cannot submit clinical records", async () => {
    const submit = (userId: string, inst: string) => as(app, userId, async (tx) => (await tx`
      select app.submit_clinical_record(${inst}, ${w.ada.patientId}, 'consultation', 'Clinic review', 'BP 150/95',
                                         '2025-05-01'::date, null, true, '2025-05-01'::date, '[]'::jsonb) as id`)[0].id);
    // Institution admin role has no records:submit capability.
    const adminRole = await createClinician(admin, { institutionId: w.lagos.institutionId, roleKey: "institution_admin" });
    expect(await submit(adminRole.userId, w.lagos.institutionId)).toBeNull();
    // Clinician whose licence is not verified.
    const unverified = await createClinician(admin, { institutionId: w.lagos.institutionId, verified: false });
    expect(await submit(unverified.userId, w.lagos.institutionId)).toBeNull();
    // Suspended membership.
    const suspended = await createClinician(admin, { institutionId: w.lagos.institutionId });
    await admin`update professional_affiliations set status = 'suspended' where id = ${suspended.affiliationId}`;
    expect(await submit(suspended.userId, w.lagos.institutionId)).toBeNull();
    // A patient.
    expect(await submit(w.bayo.userId!, w.lagos.institutionId)).toBeNull();
    // Denials are logged with reasons.
    const reasons = (await admin`select denial_reason from access_events where action = 'submit_record' and outcome = 'denied'`).map((r) => r.denial_reason);
    expect(reasons).toEqual(expect.arrayContaining(["missing_capability", "professional_not_verified", "affiliation_suspended", "not_a_professional"]));

    // Authorised clinician must first attest an encounter if there's no relationship.
    await expectCode(as(app, w.abuja.userId, (tx) => tx`
      select app.submit_clinical_record(${w.abuja.institutionId}, ${w.bayo.patientId}, 'consultation', 'Review', null,
                                         '2025-05-01'::date, null, false, null, '[]'::jsonb)`).catch(async (e) => {
      // Abuja already has records for Bayo but no care_relationship row; attestation is required.
      throw e;
    }), "NP409");
    const id = await submit(w.lagos.userId, w.lagos.institutionId);
    expect(id).toBeTruthy();
    const [rec] = await admin`select source, verification_status, institution_id, professional_id from medical_records where id = ${id}`;
    expect(rec).toMatchObject({ source: "institution_submission", verification_status: "institution_verified",
      institution_id: w.lagos.institutionId, professional_id: w.lagos.professionalId });
    // Submitting never grants read access.
    expect((await providerGet(w.lagos.userId, w.lagos.institutionId, id)).allowed).toBe(false);
    const [notif] = await admin`select count(*)::int n from notifications where user_id = ${w.ada.userId} and type = 'new_record'`;
    expect(notif.n).toBeGreaterThan(0);
  });

  it("11. administrators cannot casually access clinical information", async () => {
    expect(await as(app, w.adminUser, (tx) => tx`select id from medical_records`)).toHaveLength(0);
    expect(await as(app, w.adminUser, (tx) => tx`select id from medical_record_attachments`)).toHaveLength(0);
    expect(await as(app, w.adminUser, (tx) => tx`select id from record_versions`)).toHaveLength(0);
    expect(await as(app, w.adminUser, (tx) => tx`select patient_id from patient_profiles`)).toHaveLength(0);
    expect((await providerGet(w.adminUser, w.lagos.institutionId, w.adaLab)).allowed).toBe(false);
    const dl = await as(app, w.adminUser, async (tx) => (await tx`select app.authorize_attachment(${w.adaLabFile}, null) as r`)[0].r);
    expect(dl.allowed).toBe(false);
    // Admins do get support metadata and aggregates.
    const rows = await as(app, w.adminUser, (tx) => tx`select * from app.admin_list_patients('Adaeze', 10, 0)`);
    expect(rows[0]).toHaveProperty("verification_status");
    expect(Object.keys(rows[0])).not.toEqual(expect.arrayContaining(["title", "description", "category_key"]));
    const [{ o }] = await as(app, w.adminUser, (tx) => tx`select app.admin_overview() as o`);
    expect(o.patients).toBeGreaterThan(0);
  });

  it("12. every protected access attempt creates an access event", async () => {
    const before = (await accessEvents({ actor: w.colleague.userId })).length;
    await providerGet(w.colleague.userId, w.lagos.institutionId, w.adaLab);           // denied
    await providerRecords(w.colleague.userId, w.lagos.institutionId, w.ada.patientId); // denied
    const reqId = await requestAccess(w);
    const permId = await approve(w, reqId);
    await providerGet(w.colleague.userId, w.lagos.institutionId, w.adaLab);           // allowed
    const evs = (await accessEvents({ actor: w.colleague.userId })).slice(before);
    expect(evs.map((e) => `${e.action}:${e.outcome}`)).toEqual([
      "view_record:denied", "view_record_list:denied", "view_record:allowed",
    ]);
    expect(evs[2].permission_id).toBe(permId);
    expect(evs[2].record_id).toBe(w.adaLab);
    // …and the patient can see it in their activity feed.
    const feed = await as(app, w.ada.userId, (tx) => tx`select kind, actor_name from app.patient_activity(${w.ada.patientId}) where kind = 'viewed'`);
    expect(feed.some((f) => f.actor_name === "Dr Ngozi Obi")).toBe(true);
    await as(app, w.ada.userId, (tx) => tx`select app.revoke_permission(${permId}, null)`);
  });

  it("13. unauthorised downloads/exports are blocked and logged; authorised ones are recorded", async () => {
    const denied = await as(app, w.colleague.userId, async (tx) => (await tx`select app.authorize_attachment(${w.adaLabFile}, ${w.lagos.institutionId}) as r`)[0].r);
    expect(denied.allowed).toBe(false);
    expect(denied).not.toHaveProperty("storage_key");
    const reqId = await requestAccess(w);
    const permId = await approve(w, reqId);
    const ok = await as(app, w.colleague.userId, async (tx) => (await tx`select app.authorize_attachment(${w.adaLabFile}, ${w.lagos.institutionId}) as r`)[0].r);
    expect(ok.allowed).toBe(true);
    const [x] = await admin`select count(*)::int n from export_events where permission_id = ${permId} and destination = 'institution'`;
    expect(x.n).toBe(1);
    // Patient self-download is recorded too.
    const self = await as(app, w.ada.userId, async (tx) => (await tx`select app.authorize_attachment(${w.adaLabFile}, null) as r`)[0].r);
    expect(self.allowed).toBe(true);
    await as(app, w.ada.userId, (tx) => tx`select app.revoke_permission(${permId}, null)`);
  });

  it("15. direct database calls cannot bypass the workflow", async () => {
    // No direct writes to clinical, permission or audit tables.
    await expectCode(as(app, w.lagos.userId, (tx) => tx`insert into medical_records(patient_id, category_key, title, source, verification_status, submitted_by_user_id)
      values (${w.ada.patientId}, 'diagnosis', 'Forged', 'institution_submission', 'institution_verified', ${w.lagos.userId})`), "42501");
    await expectCode(as(app, w.lagos.userId, (tx) => tx`insert into permissions(reference, patient_id, institution_id, purpose, purpose_detail,
      authorization_basis, granted_by_user_id, expires_at) values ('X', ${w.ada.patientId}, ${w.lagos.institutionId}, 'referral', 'forged',
      'legal_obligation', ${w.lagos.userId}, now() + interval '1 day')`), "42501");
    await expectCode(as(app, w.ada.userId, (tx) => tx`update permissions set expires_at = now() + interval '10 years'`), "42501");
    await expectCode(as(app, w.ada.userId, (tx) => tx`update medical_records set verification_status = 'institution_verified'`), "42501");
    await expectCode(as(app, w.ada.userId, (tx) => tx`delete from access_events`), "42501");
    await expectCode(as(app, w.ada.userId, (tx) => tx`insert into audit_logs(action, entity_type, hash) values ('x','y','z')`), "42501");
    // Internal helpers are not callable by clients.
    await expectCode(as(app, w.ada.userId, (tx) => tx`select app.audit('forged', 'x', 'y')`), "42501");
    await expectCode(as(app, w.ada.userId, (tx) => tx`select app.notify(${w.bayo.userId}::uuid, 't', 'spam', 'spam')`), "42501");
    await expectCode(as(app, w.ada.userId, (tx) => tx`select app.record_snapshot(${w.bayoRecord})`), "42501");
    // Auth tables are invisible.
    await expectCode(as(app, w.ada.userId, (tx) => tx`select * from auth_sessions`), "42501");
    // Patients can only change the profile columns they're allowed to.
    await expectCode(as(app, w.ada.userId, (tx) => tx`update patient_profiles set full_name = 'Someone Else'`), "42501");
    const upd = await as(app, w.ada.userId, (tx) => tx`update patient_profiles set lga = 'Ikeja' where patient_id = ${w.bayo.patientId} returning patient_id`);
    expect(upd).toHaveLength(0);
    // Spoofing another user's id inside a function argument doesn't help: identity comes from the session claim.
    await expectCode(as(app, w.bayo.userId, (tx) => tx`select app.revoke_permission(${crypto.randomUUID()}, null)`), "NP404");
    // A provider cannot see other institutions' requests.
    const others = await as(app, w.abuja.userId, (tx) => tx`select id from access_requests where institution_id = ${w.lagos.institutionId}`);
    expect(others).toHaveLength(0);
  });

  it("professional leaving the institution loses access, including personal grants", async () => {
    const leaver = await createClinician(admin, { institutionId: w.lagos.institutionId, fullName: "Dr Leaving" });
    const instAdmin = await createClinician(admin, { institutionId: w.lagos.institutionId, roleKey: "institution_admin" });
    const reqId = await as(app, leaver.userId, async (tx) => (await tx`select app.create_access_request(${w.lagos.institutionId},
      ${w.bayo.patientId}, 'follow_up', 'Diabetes follow-up review', array['diagnosis']::text[], null, null, 30) as id`)[0].id);
    const permId = await as(app, w.bayo.userId, async (tx) => (await tx`select app.decide_access_request(${reqId}, 'partial',
      array['diagnosis']::text[], null, null, null, 30, true) as id`)[0].id);
    expect((await providerGet(leaver.userId, w.lagos.institutionId, w.bayoRecord)).allowed).toBe(true);
    await as(app, instAdmin.userId, (tx) => tx`select app.set_affiliation_status(${leaver.affiliationId}, 'ended', 'Resigned')`);
    expect((await providerGet(leaver.userId, w.lagos.institutionId, w.bayoRecord)).allowed).toBe(false);
    const [p] = await admin`select status, revocation_reason from permissions where id = ${permId}`;
    expect(p.status).toBe("revoked");
  });
});
