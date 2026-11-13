"use server";
import { z } from "zod";
import { handle } from "@/lib/action";
import { withActor } from "@/lib/db";
import { requestMeta } from "@/lib/request";
import { getActor, hasRecentReauth } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors";
import { stepUp } from "@/server/auth";
import { revokeAllSessions } from "@/lib/auth/session";

type Input = { reason: string; credential: string };
const id = z.string().uuid();

/** Every admin mutation: platform staff, MFA-verified session, step-up within 10 min, audited in SQL. */
async function admin(input?: Input) {
  const actor = await getActor();
  if (!actor || !actor.platformRoles.length || !actor.mfaEnabled || !actor.mfaVerified) throw new AppError(403, "Platform staff only.");
  if (!hasRecentReauth(actor)) {
    if (!input?.credential) throw new AppError(401, "Confirm it's you with your authenticator code.");
    await stepUp(actor, input.credential);
  }
  return { actor, meta: await requestMeta() };
}

export async function setInstitutionStatusAction(instId: string, status: string, input: Input) {
  return handle("admin_inst_status", async () => {
    const { actor, meta } = await admin(input);
    const s = z.enum(["under_review", "approved", "rejected", "suspended"]).parse(status);
    await withActor(actor.userId, (tx) => tx`select app.admin_set_institution_status(${id.parse(instId)}, ${s}, ${input.reason || null})`, meta);
  }, "Institution status updated and the institution notified.");
}

export async function setProfessionalStatusAction(proId: string, status: string, input: Input) {
  return handle("admin_pro_status", async () => {
    const { actor, meta } = await admin(input);
    const s = z.enum(["verified", "rejected", "suspended", "pending"]).parse(status);
    await withActor(actor.userId, (tx) => tx`select app.admin_set_professional_status(${id.parse(proId)}, ${s}, ${input.reason || null})`, meta);
  }, "Professional status updated.");
}

export async function endAffiliationAction(affId: string, input: Input) {
  return handle("admin_end_affiliation", async () => {
    const { actor, meta } = await admin(input);
    await withActor(actor.userId, (tx) => tx`select app.set_affiliation_status(${id.parse(affId)}, 'revoked', ${input.reason || null})`, meta);
  }, "Affiliation revoked.");
}

export async function setUserStatusAction(userId: string, status: string, input: Input) {
  return handle("admin_user_status", async () => {
    const { actor, meta } = await admin(input);
    const s = z.enum(["active", "suspended", "locked", "closed"]).parse(status);
    await withActor(actor.userId, (tx) => tx`select app.admin_set_user_status(${id.parse(userId)}, ${s}, ${input.reason})`, meta);
    if (s !== "active") await revokeAllSessions(userId, `admin_${s}`);
  }, "Account status updated.");
}

export async function decideIdentityAction(verificationId: string, status: "verified" | "failed", input: Input) {
  return handle("admin_identity", async () => {
    const { actor, meta } = await admin(input);
    await withActor(actor.userId, (tx) => tx`select app.admin_decide_identity(${id.parse(verificationId)}, ${status}, ${input.reason || null})`, meta);
  }, "Identity decision recorded.");
}

export async function setRepresentativeAction(repId: string, status: "active" | "revoked", input: Input) {
  return handle("admin_rep", async () => {
    const { actor, meta } = await admin(input);
    await withActor(actor.userId, (tx) => tx`select app.admin_set_representative_status(${id.parse(repId)}, ${status}, ${input.reason})`, meta);
  }, "Representative status updated.");
}

export async function reviewEmergencyAction(permissionId: string, outcome: "appropriate" | "inappropriate", input: Input) {
  return handle("admin_emergency_review", async () => {
    const { actor, meta } = await admin(input);
    await withActor(actor.userId, (tx) => tx`select app.admin_review_emergency(${id.parse(permissionId)}, ${outcome}, ${input.reason})`, meta);
  }, "Review recorded and the patient notified.");
}

export async function updateIncidentAction(incidentId: string, status: string, input: Input) {
  return handle("admin_incident", async () => {
    const { actor, meta } = await admin(input);
    const s = z.enum(["open", "investigating", "contained", "resolved", "dismissed"]).parse(status);
    await withActor(actor.userId, (tx) => tx`select app.admin_update_incident(${id.parse(incidentId)}, ${s}, ${input.reason || null}, true)`, meta);
  }, "Incident updated.");
}

export async function updateTicketAction(ticketId: string, status: string, input: Input & { internal?: boolean }) {
  return handle("admin_ticket", async () => {
    const actor = await getActor();
    if (!actor || !actor.platformRoles.length || !actor.mfaVerified) throw new AppError(403, "Platform staff only.");
    const s = z.enum(["open", "in_progress", "awaiting_requester", "resolved", "closed"]).parse(status);
    await withActor(actor.userId, (tx) => tx`select app.admin_update_ticket(${id.parse(ticketId)}, ${s}, ${input.reason || null}, ${!input.internal}, true)`, await requestMeta());
  }, "Ticket updated.");
}

export async function internalTicketNoteAction(ticketId: string, status: string, input: Input) {
  return updateTicketAction(ticketId, status, { ...input, internal: true });
}

export async function updateSettingAction(key: string, input: Input) {
  return handle("admin_setting", async () => {
    const { actor, meta } = await admin(input);
    let value: unknown;
    try { value = JSON.parse(input.reason); } catch { throw new AppError(400, "Enter a valid value (a number, or a JSON list for lists)."); }
    await withActor(actor.userId, (tx) => tx`select app.admin_update_setting(${z.string().max(80).parse(key)}, ${tx.json(value as never)}::jsonb)`, meta);
  }, "Setting updated.");
}

export async function verifyAuditChainAction() {
  return handle("admin_verify_chain", async () => {
    const actor = await getActor();
    if (!actor || !actor.platformRoles.some((r) => r === "security_officer" || r === "platform_admin")) throw new AppError(403, "Not permitted.");
    const [r] = await withActor(actor.userId, (tx) => tx`select * from app.verify_audit_chain()`);
    return { valid: r.valid as boolean, checked: Number(r.checked), brokenAt: r.first_broken_seq ? Number(r.first_broken_seq) : null };
  });
}
