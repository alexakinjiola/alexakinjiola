"use server";
import { cookies } from "next/headers";
import { z } from "zod";
import { handle, parse } from "@/lib/action";
import { withActor } from "@/lib/db";
import { requestMeta } from "@/lib/request";
import { getActor, hasRecentReauth } from "@/lib/auth/actor";
import { INSTITUTION_COOKIE, requireProviderContext } from "@/lib/auth/provider-context";
import { AppError } from "@/lib/errors";
import { identifierHashCandidates, randomToken, sha256Hex } from "@/lib/crypto";
import type postgres from "postgres";
import { queueMessage } from "@/lib/mailer";
import { withService } from "@/lib/db";
import { env } from "@/lib/env";
import { stepUp } from "@/server/auth";
import { emailSchema, nameSchema, phoneSchema, uuid } from "@/lib/validation/common";
import { CATEGORY_KEYS } from "@/lib/labels";

async function current() {
  const ctx = await requireProviderContext();
  if (!ctx.current) throw new AppError(403, "You're not an active member of an institution.");
  return { ...ctx, inst: ctx.current.institutionId, meta: await requestMeta() };
}

export async function switchInstitutionAction(institutionId: string) {
  return handle("switch_institution", async () => {
    const actor = await getActor();
    if (!actor?.affiliations.some((a) => a.institutionId === institutionId && a.status === "active")) throw new AppError(403, "Not a member of that institution.");
    (await cookies()).set(INSTITUTION_COOKIE, institutionId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  });
}

const searchSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("health_id"), healthId: z.string().trim().min(5, "Enter the patient's Health ID.") }),
  z.object({ method: z.literal("phone"), phone: phoneSchema, dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date of birth.") }),
  z.object({ method: z.literal("nin"), nin: z.string().trim().regex(/^\d{11}$/, "NIN is 11 digits."), dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date of birth.") }),
]);
export async function searchPatientAction(input: unknown) {
  return handle("search_patient", async () => {
    const v = parse(searchSchema, input);
    const { actor, inst, meta } = await current();
    // NIN lookups try the active fingerprint key first, then retired ones (key rotation).
    const ninHashes = v.method === "nin" ? identifierHashCandidates(v.nin) : [null];
    let rows: Awaited<ReturnType<typeof withActor<postgres.Row[]>>> = [];
    for (const h of ninHashes) {
      rows = await withActor(actor.userId, (tx) => tx`select * from app.search_patients(${inst},
        ${v.method === "health_id" ? v.healthId : null}, ${v.method === "phone" ? v.phone : null},
        ${v.method !== "health_id" ? v.dob : null}::date, ${h})`, meta);
      if (rows.length) break;
    }
    return rows.map((r) => ({ ...r })) as unknown as {
      patient_id: string; masked_name: string; birth_year: number; sex: string; health_id_hint: string; has_active_permission: boolean; has_pending_request: boolean;
    }[];
  });
}

const requestSchema = z.object({
  patientId: uuid,
  purpose: z.enum(["ongoing_care", "referral", "specialist_consultation", "diagnostic_review", "second_opinion", "follow_up", "other"], { message: "Choose a purpose." }),
  purposeDetail: z.string().trim().min(10, "Explain the clinical purpose in at least 10 characters.").max(1000),
  categories: z.array(z.enum(CATEGORY_KEYS as [string, ...string[]])).min(1, "Choose at least one category."),
  dateFrom: z.string().transform((v) => v || null), dateTo: z.string().transform((v) => v || null),
  durationDays: z.coerce.number().int().min(1).max(365),
});
export async function createAccessRequestAction(input: unknown) {
  return handle("create_request", async () => {
    const v = parse(requestSchema, input);
    const { actor, inst, meta } = await current();
    const [r] = await withActor(actor.userId, (tx) => tx`select app.create_access_request(${inst}, ${v.patientId}, ${v.purpose}, ${v.purposeDetail},
      ${v.categories}::text[], ${v.dateFrom}::date, ${v.dateTo}::date, ${v.durationDays}) as id`, meta);
    return { requestId: r.id as string };
  }, "Request sent. The patient has been notified.");
}

export async function cancelRequestAction(requestId: string) {
  return handle("cancel_request", async () => {
    const { actor, meta } = await current();
    await withActor(actor.userId, (tx) => tx`select app.cancel_access_request(${uuid.parse(requestId)})`, meta);
  }, "Request withdrawn.");
}

const emergencySchema = z.object({
  patientId: uuid,
  justification: z.string().trim().min(40, "Describe the emergency in at least 40 characters.").max(2000),
  categories: z.array(z.string()).min(1, "Choose at least one category."),
  credential: z.string().optional(),
  attest: z.literal(true, { message: "Confirm the declaration." }),
});
export async function emergencyAccessAction(input: unknown) {
  return handle("emergency_access", async () => {
    const v = parse(emergencySchema, input);
    const { actor, inst, meta } = await current();
    if (!hasRecentReauth(actor, 5)) {
      if (!v.credential) throw new AppError(401, "Confirm your identity with your authenticator code.");
      await stepUp(actor, v.credential);
    }
    const [r] = await withActor(actor.userId, (tx) => tx`select app.emergency_access(${inst}, ${v.patientId}, ${v.justification}, ${v.categories}::text[]) as id`, meta);
    if (!r.id) throw new AppError(403, "Emergency access was refused. Your role may not permit it, or the daily limit was reached. The attempt was logged.");
  }, "Emergency access opened. It's time-limited and will be reviewed.");
}

const instSchema = z.object({
  name: z.string().trim().min(3, "Enter the institution's registered name.").max(200),
  institution_type: z.enum(["hospital", "clinic", "laboratory", "diagnostic_centre", "primary_health_centre", "pharmacy"], { message: "Choose a type." }),
  registration_number: z.string().trim().min(3, "Enter the registration number.").max(50),
  license_number: z.string().trim().min(3, "Enter the operating licence number.").max(50),
  license_authority: z.string().trim().min(3, "Who issued the licence?").max(120),
  license_expires_on: z.string().trim(),
  address_line: z.string().trim().min(5, "Enter the street address.").max(200),
  city: z.string().trim().min(2, "Enter the city or town.").max(80),
  state: z.string().trim().min(2, "Choose a state."),
  lga: z.string().trim().max(80),
  email: emailSchema, phone: phoneSchema, website: z.string().trim().max(200),
  representative_name: nameSchema, representative_title: z.string().trim().min(2, "Enter their job title.").max(80),
  representative_email: emailSchema, representative_phone: phoneSchema,
});
export async function saveInstitutionAction(input: unknown, institutionId?: string) {
  return handle("save_institution", async () => {
    const v = parse(instSchema, input);
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Sign in again.");
    const meta = await requestMeta();
    if (institutionId) {
      await withActor(actor.userId, (tx) => tx`select app.update_institution_draft(${uuid.parse(institutionId)}, ${tx.json(v)}::jsonb)`, meta);
      return { id: institutionId };
    }
    const [r] = await withActor(actor.userId, (tx) => tx`select app.register_institution(${tx.json(v)}::jsonb) as id`, meta);
    (await cookies()).set(INSTITUTION_COOKIE, r.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
    return { id: r.id as string };
  }, "Saved.");
}

export async function submitInstitutionAction(institutionId: string) {
  return handle("submit_institution", async () => {
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Sign in again.");
    await withActor(actor.userId, (tx) => tx`select app.submit_institution(${uuid.parse(institutionId)})`, await requestMeta());
  }, "Application submitted for verification.");
}

const inviteSchema = z.object({
  fullName: nameSchema, email: emailSchema,
  roleKey: z.enum(["clinician", "lab_scientist", "records_officer", "institution_admin"], { message: "Choose a role." }),
});
export async function inviteStaffAction(input: unknown) {
  return handle("invite_staff", async () => {
    const v = parse(inviteSchema, input);
    const { actor, inst, current: c, meta } = await current();
    const token = randomToken();
    await withActor(actor.userId, (tx) => tx`select app.invite_staff(${inst}, ${v.email}, ${v.fullName}, ${v.roleKey}, ${sha256Hex(token)})`, meta);
    await withService((tx) => queueMessage(tx, {
      to: v.email, template: "staff_invitation", subject: `You've been invited to join ${c!.institutionName}`,
      body: `${actor.displayName} invited you to join ${c!.institutionName} on ${process.env.NEXT_PUBLIC_PLATFORM_NAME ?? "Continuum"}.\n\nAccept the invitation here (expires in 7 days):\n${env().APP_URL}/invite/${token}\n\nYou'll need to sign in with this email address and provide your professional licence details.`,
    }));
  }, "Invitation sent.");
}

export async function setStaffStatusAction(affiliationId: string, status: "active" | "suspended" | "revoked" | "ended", input: { reason: string }) {
  return handle("staff_status", async () => {
    const { actor, meta } = await current();
    await withActor(actor.userId, (tx) => tx`select app.set_affiliation_status(${uuid.parse(affiliationId)}, ${status}, ${input.reason || null})`, meta);
  }, "Staff access updated.");
}

export async function resolveCorrectionAction(correctionId: string, status: "under_review" | "resolved" | "rejected", input: { reason: string }) {
  return handle("resolve_correction", async () => {
    const { actor, meta } = await current();
    await withActor(actor.userId, (tx) => tx`select app.institution_resolve_correction(${uuid.parse(correctionId)}, ${status}, ${input.reason})`, meta);
  }, "Response recorded and the patient was notified.");
}

const acceptSchema = z.object({
  token: z.string().min(20), fullName: nameSchema,
  profession: z.enum(["medical_doctor", "dentist", "nurse_midwife", "pharmacist", "medical_lab_scientist", "radiographer", "health_records_officer", "administrator", "other"]),
  licenseBody: z.string().trim().max(20), licenseNumber: z.string().trim().max(50), licenseExpires: z.string().trim(),
}).refine((v) => v.profession === "administrator" || (v.licenseBody && v.licenseNumber.length >= 3), { path: ["licenseNumber"], message: "Enter your licence number." });
export async function acceptInvitationAction(input: unknown) {
  return handle("accept_invitation", async () => {
    const v = parse(acceptSchema, input);
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Sign in first.");
    await withActor(actor.userId, (tx) => tx`select app.accept_staff_invitation(${sha256Hex(v.token)}, ${v.fullName}, ${v.profession},
      ${v.licenseBody}, ${v.licenseNumber}, ${v.licenseExpires || null}::date)`, await requestMeta());
    return { redirect: actor.mfaEnabled ? "/provider" : "/auth/mfa/setup" };
  }, "Welcome aboard.");
}

export async function providerTicketAction(input: unknown) {
  return handle("provider_ticket", async () => {
    const v = parse(z.object({
      category: z.enum(["institution_verification", "account_access", "technical", "record_correction", "suspicious_activity", "other"]),
      subject: z.string().trim().min(4).max(200), description: z.string().trim().min(10).max(5000),
    }), input);
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Sign in again.");
    const ctx = await requireProviderContext();
    const [r] = await withActor(actor.userId, (tx) => tx`select app.create_support_ticket(${v.category}, ${v.subject}, ${v.description}, ${ctx.current?.institutionId ?? null}, null) as ref`);
    return { reference: r.ref as string };
  }, "Request sent to the platform team.");
}
