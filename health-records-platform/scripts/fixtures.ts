/**
 * Synthetic data builders shared by the seed script and integration tests.
 * Uses the migration-owner connection to create PRECONDITIONS directly.
 * Behaviour under test always goes through the real app.* functions while
 * acting as a specific user (see `as()` below).
 *
 * Everything created here is flagged is_synthetic = true.
 */
import postgres, { type Sql } from "postgres";

export type Admin = Sql;

export function adminClient(url: string) {
  return postgres(url, { max: 4, onnotice: () => {} });
}

/** Run `fn` exactly as the app does for a signed-in user: role authenticated + JWT claims. */
export async function as<T>(appSql: Sql, userId: string | null, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return appSql.begin(async (tx) => {
    await tx`select set_config('role', 'authenticated', true),
                    set_config('request.jwt.claims', ${JSON.stringify(userId ? { sub: userId, role: "authenticated" } : { role: "authenticated" })}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

let seq = 0;
const uniq = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

export async function createUser(
  sql: Admin,
  o: { email?: string; name?: string; phone?: string | null; passwordHash?: string; mfaSecretEnc?: string | null; verified?: boolean } = {},
) {
  const [u] = await sql<{ id: string }[]>`
    insert into users(email, phone, display_name, password_hash, email_verified_at, phone_verified_at, is_synthetic,
                      mfa_enabled, mfa_secret_enc, mfa_enrolled_at)
    values (${o.email ?? `user-${uniq()}@example.test`}, ${o.phone ?? null}, ${o.name ?? "Synthetic User"},
            ${o.passwordHash ?? "!synthetic-no-login"}, ${o.verified === false ? null : sql`now()`},
            ${o.phone ? sql`now()` : null}, true,
            ${!!o.mfaSecretEnc}, ${o.mfaSecretEnc ?? null}, ${o.mfaSecretEnc ? sql`now()` : null})
    returning id`;
  return u.id;
}

export async function createPatient(
  sql: Admin,
  o: { userId?: string | null; fullName?: string; dob?: string; sex?: string; phone?: string | null; verified?: boolean;
       healthId?: string } = {},
) {
  const userId = o.userId === undefined ? await createUser(sql, { name: o.fullName?.split(" ")[0], phone: o.phone }) : o.userId;
  const [p] = await sql<{ id: string }[]>`
    insert into patients(user_id, verification_status, verified_at, is_synthetic)
    values (${userId}, ${o.verified === false ? "unverified" : "verified"}, ${o.verified === false ? null : sql`now()`}, true)
    returning id`;
  await sql`insert into patient_profiles(patient_id, full_name, date_of_birth, sex, phone)
            values (${p.id}, ${o.fullName ?? "Ada Synthetic"}, ${o.dob ?? "1990-04-12"}, ${o.sex ?? "female"}, ${o.phone ?? null})`;
  const [h] = await sql<{ value: string }[]>`
    insert into health_identifiers(patient_id, identifier_type, value, is_primary)
    values (${p.id}, 'platform_hid', ${o.healthId ?? sql`app.generate_health_id()`}, true) returning value`;
  return { patientId: p.id, userId: userId as string | null, healthId: h.value };
}

export async function createInstitution(
  sql: Admin,
  o: { name?: string; status?: string; type?: string; createdBy?: string; city?: string; state?: string } = {},
) {
  const createdBy = o.createdBy ?? (await createUser(sql, { name: "Institution Owner" }));
  const [i] = await sql<{ id: string }[]>`
    insert into healthcare_institutions(name, institution_type, registration_number, license_number, license_authority,
      address_line, city, state, email, phone, representative_name, representative_title, representative_email,
      representative_phone, status, submitted_at, reviewed_at, created_by, is_synthetic)
    values (${o.name ?? `Synthetic Hospital ${uniq()}`}, ${o.type ?? "hospital"}, ${`RC-${uniq()}`}, ${`LIC-${uniq()}`},
      'State Ministry of Health (synthetic)', '1 Synthetic Way', ${o.city ?? "Ikeja"}, ${o.state ?? "Lagos"},
      ${`info-${uniq()}@example.test`}, '+2348000000000', 'Synthetic Representative', 'Medical Director',
      ${`rep-${uniq()}@example.test`}, '+2348000000001', ${o.status ?? "approved"}, now(),
      ${o.status === "approved" ? sql`now()` : null}, ${createdBy}, true)
    returning id`;
  return i.id;
}

export async function createProfessional(
  sql: Admin,
  o: { userId?: string; fullName?: string; profession?: string; verified?: boolean; licenseBody?: string } = {},
) {
  const userId = o.userId ?? (await createUser(sql, { name: o.fullName ?? "Dr Synthetic" }));
  const [p] = await sql<{ id: string }[]>`
    insert into healthcare_professionals(user_id, full_name, profession, license_body, license_number, verification_status,
                                         verified_at, is_synthetic)
    values (${userId}, ${o.fullName ?? "Dr Synthetic"}, ${o.profession ?? "medical_doctor"}, ${o.licenseBody ?? "MDCN"},
            ${`MDCN/${uniq()}`}, ${o.verified === false ? "pending" : "verified"}, ${o.verified === false ? null : sql`now()`}, true)
    returning id`;
  return { professionalId: p.id, userId };
}

export async function affiliate(sql: Admin, professionalId: string, institutionId: string, roleKey = "clinician", status = "active") {
  const [a] = await sql<{ id: string }[]>`
    insert into professional_affiliations(professional_id, institution_id, role_id, status)
    values (${professionalId}, ${institutionId}, (select id from roles where key = ${roleKey}), ${status}) returning id`;
  return a.id;
}

/** A verified clinician at an (approved by default) institution. */
export async function createClinician(sql: Admin, o: { institutionId?: string; roleKey?: string; verified?: boolean; fullName?: string } = {}) {
  const institutionId = o.institutionId ?? (await createInstitution(sql));
  const pro = await createProfessional(sql, { verified: o.verified, fullName: o.fullName });
  const affiliationId = await affiliate(sql, pro.professionalId, institutionId, o.roleKey ?? "clinician");
  return { ...pro, institutionId, affiliationId };
}

export async function createRecord(
  sql: Admin,
  o: { patientId: string; category?: string; title?: string; clinicalDate?: string | null; institutionId?: string | null;
       professionalId?: string | null; submittedBy: string; source?: string; description?: string; structured?: unknown },
) {
  const source = o.source ?? (o.institutionId ? "institution_submission" : "patient_upload");
  const [r] = await sql<{ id: string }[]>`
    insert into medical_records(patient_id, category_key, title, description, clinical_date, source, verification_status, status,
                                institution_id, professional_id, attending_professional, submitted_by_user_id, structured_data, is_synthetic)
    values (${o.patientId}, ${o.category ?? "lab_result"}, ${o.title ?? "Full blood count"}, ${o.description ?? "Synthetic record"},
            ${o.clinicalDate === undefined ? "2025-06-01" : o.clinicalDate}, ${source},
            ${source === "patient_upload" ? "patient_provided" : "institution_verified"}, 'available',
            ${source === "patient_upload" ? null : (o.institutionId ?? null)}, ${source === "patient_upload" ? null : (o.professionalId ?? null)},
            ${source === "patient_upload" ? null : "Dr Synthetic"}, ${o.submittedBy},
            ${o.structured ? sql.json(o.structured as never) : null}, true)
    returning id`;
  await sql`insert into record_versions(record_id, version, change_type, snapshot, changed_by)
            values (${r.id}, 1, 'created', app.record_snapshot(${r.id}), ${o.submittedBy})`;
  return r.id;
}

export async function createAttachment(sql: Admin, recordId: string, uploadedBy: string, storageKey?: string) {
  const [a] = await sql<{ id: string }[]>`
    insert into medical_record_attachments(record_id, storage_key, file_name, mime_type, size_bytes, sha256, scan_status, scanned_at, uploaded_by)
    values (${recordId}, ${storageKey ?? `records/${crypto.randomUUID()}/${crypto.randomUUID()}`}, 'report.pdf', 'application/pdf',
            1024, encode(digest(${recordId}, 'sha256'), 'hex'), 'clean', now(), ${uploadedBy})
    returning id`;
  return a.id;
}

export async function grantPlatformRole(sql: Admin, userId: string, roleKey: string) {
  await sql`insert into user_platform_roles(user_id, role_id) values (${userId}, (select id from roles where key = ${roleKey}))`;
}
