import { beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { admin, app, expectCode } from "./helpers";
import { as, createClinician, createPatient, createRecord } from "../scripts/fixtures";
import { fromFhirBundle, healthIdFromBundle, toFhirBundle } from "@/lib/fhir";
import { deliverDue } from "@/lib/messaging/delivery";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

describe("patient export", () => {
  it("exports only the caller's own records, logs the export and notifies", async () => {
    const p = await createPatient(admin, { fullName: "Export Owner" });
    const other = await createPatient(admin, { fullName: "Someone Else" });
    await createRecord(admin, { patientId: p.patientId, title: "Own record", submittedBy: p.userId! });
    await createRecord(admin, { patientId: other.patientId, title: "Not yours", submittedBy: other.userId! });
    const [{ e }] = await as(app, p.userId, (tx) => tx`select app.patient_export(${p.patientId}, null, 'structured_bundle') as e`);
    expect(e.records.map((r: { title: string }) => r.title)).toEqual(["Own record"]);
    const [x] = await admin`select export_type, cardinality(record_ids) n from export_events where patient_id = ${p.patientId}`;
    expect(x).toMatchObject({ export_type: "structured_bundle", n: 1 });
    const [n] = await admin`select security_critical from notifications where user_id = ${p.userId} and type = 'record_export'`;
    expect(n.security_critical).toBe(true);
    await expectCode(as(app, p.userId, (tx) => tx`select app.patient_export(${other.patientId}, null, 'structured_bundle')`), "NP403");
    // A provider can't use it either.
    const doc = await createClinician(admin);
    await expectCode(as(app, doc.userId, (tx) => tx`select app.patient_export(${p.patientId}, null, 'record_summary_pdf')`), "NP403");
  });
});

describe("integration ingestion", () => {
  let doc: Awaited<ReturnType<typeof createClinician>>;
  let instAdmin: Awaited<ReturnType<typeof createClinician>>;
  let patient: Awaited<ReturnType<typeof createPatient>>;
  const key = "cnt_live_test_integration_key_abcdefghijklmnop";
  let connId: string;
  const records = [
    { source_ref: "Observation/hb-1", category: "lab_result", title: "Haemoglobin", description: "", clinical_date: "2025-10-01", practitioner: "Dr Lab", structured_data: { results: [{ test: "Hb", value: 13.1, unit: "g/dL" }] } },
    { source_ref: "Condition/htn-1", category: "diagnosis", title: "Hypertension", description: "I10", clinical_date: "2025-09-01", practitioner: null, structured_data: null },
  ];

  beforeAll(async () => {
    doc = await createClinician(admin);
    instAdmin = await createClinician(admin, { institutionId: doc.institutionId, roleKey: "institution_admin" });
    patient = await createPatient(admin, { fullName: "Integrated Patient" });
    const [{ id }] = await as(app, instAdmin.userId, (tx) => tx`select app.create_integration(${doc.institutionId}, 'OpenMRS main', 'emr', 'fhir_r4', 'cnt_live_test_in', ${sha(key)}) as id`);
    connId = id;
  });

  it("only institution admins can register; only platform admins can activate", async () => {
    await expectCode(as(app, doc.userId, (tx) => tx`select app.create_integration(${doc.institutionId}, 'Rogue', 'emr', 'fhir_r4', 'x', 'y')`), "NP403");
    await expectCode(as(app, instAdmin.userId, (tx) => tx`select app.set_integration_status(${connId}, 'active')`), "NP403");
    await expectCode(admin.begin(async (tx) => { await tx`select set_config('role','service_role',true)`; await tx`select app.integration_ingest(${sha(key)}, ${patient.healthId}, ${tx.json(records)}::jsonb)`; }), "NP403");
  });

  it("an active key ingests with integration provenance, idempotently; clients can't call ingest", async () => {
    await admin`update integration_connections set status = 'active' where id = ${connId}`;
    const ingest = () => admin.begin(async (tx) => {
      await tx`select set_config('role','service_role',true)`;
      return (await tx`select app.integration_ingest(${sha(key)}, ${patient.healthId}, ${tx.json(records)}::jsonb) as r`)[0].r;
    });
    expect(await ingest()).toMatchObject({ created: 2, skipped_duplicates: 0 });
    expect(await ingest()).toMatchObject({ created: 0, skipped_duplicates: 2 });
    const rows = await admin`select source, verification_status, integration_connection_id from medical_records where patient_id = ${patient.patientId}`;
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.source === "integration" && r.verification_status === "integration_verified" && r.integration_connection_id === connId)).toBe(true);
    // Ingestion never grants read access to the sending institution.
    const read = await as(app, doc.userId, (tx) => tx`select * from app.provider_list_records(${doc.institutionId}, ${patient.patientId})`);
    expect(read).toHaveLength(0);
    // Not callable by an authenticated client.
    await expectCode(as(app, doc.userId, (tx) => tx`select app.integration_ingest(${sha(key)}, ${patient.healthId}, '[]'::jsonb)`), "42501");
    // Wrong key / revoked key.
    await expectCode(admin.begin(async (tx) => { await tx`select set_config('role','service_role',true)`; await tx`select app.integration_ingest(${sha("wrong")}, ${patient.healthId}, '[]'::jsonb)`; }), "NP403");
  });

  it("unverified patients can't be matched", async () => {
    const unverified = await createPatient(admin, { verified: false });
    await expectCode(admin.begin(async (tx) => { await tx`select set_config('role','service_role',true)`;
      await tx`select app.integration_ingest(${sha(key)}, ${unverified.healthId}, ${tx.json(records)}::jsonb)`; }), "NP404");
  });
});

describe("FHIR mapping", () => {
  const bundle = {
    resourceType: "Bundle", type: "transaction", entry: [
      { resource: { resourceType: "Patient", id: "p1", identifier: [{ system: "https://example/fhir/health-id", value: "NG 1234 5678 92" }] } },
      { resource: { resourceType: "Observation", id: "o1", code: { text: "Haemoglobin" }, valueQuantity: { value: 11.2, unit: "g/dL" },
        interpretation: [{ coding: [{ code: "L" }] }], referenceRange: [{ text: "12–15.5" }] } },
      { resource: { resourceType: "DiagnosticReport", id: "r1", code: { text: "Full blood count" }, effectiveDateTime: "2025-10-02T09:00:00Z",
        result: [{ reference: "Observation/o1" }], conclusion: "Mild anaemia" } },
      { resource: { resourceType: "Condition", id: "c1", code: { coding: [{ system: "http://hl7.org/fhir/sid/icd-10", code: "E11", display: "Type 2 diabetes" }] }, onsetDateTime: "2019-04-01" } },
      { resource: { resourceType: "AllergyIntolerance", id: "a1", code: { text: "Penicillin" }, reaction: [{ manifestation: [{ text: "Rash" }] }] } },
      { resource: { resourceType: "Basic", id: "b1" } },
    ],
  };
  it("maps a hospital bundle to normalised records without guessing unknown types", () => {
    expect(healthIdFromBundle(bundle)).toBe("NG1234567892");
    const { records, unsupported } = fromFhirBundle(bundle);
    expect(unsupported).toEqual(["Basic"]);
    const report = records.find((r) => r.source_ref === "DiagnosticReport/r1")!;
    expect(report).toMatchObject({ category: "lab_result", title: "Full blood count", clinical_date: "2025-10-02" });
    expect((report.structured_data as { results: { flag: string }[] }).results[0].flag).toBe("low");
    expect(records.some((r) => r.source_ref === "Observation/o1")).toBe(false); // folded into the report
    expect(records.find((r) => r.category === "diagnosis")!.title).toBe("Type 2 diabetes");
    expect(records.find((r) => r.category === "allergy")!.description).toBe("Rash");
  });
  it("exports a valid collection bundle with provenance tags", () => {
    const out = toFhirBundle({ generated_at: "2026-01-01T00:00:00Z", patient: { id: "p", full_name: "A B", date_of_birth: "1990-01-01", sex: "female", health_id: "NG1234567892" },
      records: [{ id: "r", category: "diagnosis", title: "Asthma", description: null, clinical_date: "2020-01-01", added_at: "2020-01-02", source: "patient_upload",
        verification_status: "patient_provided", institution: null, professional: null, facility: null, structured_data: null }] }, "https://x");
    expect(out.type).toBe("collection");
    const cond = out.entry[1] as { resource: { resourceType: string; meta: { tag: { code: string }[] } } };
    expect(cond.resource.resourceType).toBe("Condition");
    expect(cond.resource.meta.tag[0].code).toBe("patient_provided");
  });
});

describe("message delivery worker", () => {
  it("sends with the log driver and retries failures with backoff", async () => {
    await admin`update message_outbox set status = 'sent' where status = 'queued'`;
    await admin`insert into message_outbox(channel, recipient, template, subject, body) values ('email', 'a@example.test', 't', 's', 'b')`;
    await admin`insert into message_outbox(channel, recipient, template, body) values ('sms', '+2348000000000', 't', 'code')`;
    const r = await deliverDue(app, { mailDriver: "log", smsDriver: "webhook", smsWebhookUrl: "http://127.0.0.1:9/unreachable" });
    expect(r).toMatchObject({ sent: 1, retried: 1, failed: 0 });
    const [sms] = await admin`select status, attempts, next_attempt_at > now() as later, last_error from message_outbox where channel = 'sms' order by created_at desc limit 1`;
    expect(sms).toMatchObject({ status: "queued", attempts: 1, later: true });
    // Not due yet → untouched on the next run.
    expect(await deliverDue(app, { mailDriver: "log", smsDriver: "webhook", smsWebhookUrl: "http://127.0.0.1:9/x" })).toMatchObject({ sent: 0, retried: 0 });
  });
});

describe("function privilege regression", () => {
  it("no app.* function is executable by PUBLIC/anon, and internal helpers stay closed to clients", async () => {
    const anonExec = await admin`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'app' and has_function_privilege('anon', p.oid, 'execute')`;
    expect(anonExec).toEqual([]);
    const internal = ["integration_ingest", "notify", "notify_patient", "notify_institution", "audit", "log_access", "record_snapshot", "run_expiry", "generate_health_id"];
    const leaked = await admin`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'app' and p.proname = any(${internal}) and has_function_privilege('authenticated', p.oid, 'execute')`;
    expect(leaked).toEqual([]);
  });
});

describe("PDF text safety (clinical values)", () => {
  it("never turns exponents into ordinary digits", async () => {
    const { pdfSafeText } = await import("@/lib/export-pdf");
    expect(pdfSafeText("Platelets 265 ×10⁹/L")).toBe("Platelets 265 ×10^9/L");
    expect(pdfSafeText("RBC 4.5 ×10¹²/L")).toBe("RBC 4.5 ×10^12/L");
    expect(pdfSafeText("Range 12.0–15.5")).toBe("Range 12.0-15.5");
  });
});
