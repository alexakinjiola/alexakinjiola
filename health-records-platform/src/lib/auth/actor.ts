import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { withService } from "../db";
import { readSessionCookie, validateSessionToken, type SessionRow } from "./session";

export interface Affiliation {
  id: string;
  institutionId: string;
  institutionName: string;
  institutionStatus: string;
  institutionType: string;
  roleKey: string;
  roleName: string;
  capabilities: string[];
  status: string;
}

export interface Representation {
  patientId: string;
  fullName: string;
  relationship: string;
}

export interface Actor {
  userId: string;
  sessionId: string;
  email: string;
  displayName: string;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  mfaEnabled: boolean;
  mfaVerified: boolean;
  reauthenticatedAt: Date | null;
  isSynthetic: boolean;
  patient: { id: string; verificationStatus: string; status: string } | null;
  professional: { id: string; fullName: string; profession: string; verificationStatus: string } | null;
  affiliations: Affiliation[];
  ownedInstitutionDrafts: { id: string; name: string; status: string }[];
  platformRoles: string[];
  representations: Representation[];
}

async function loadActor(session: SessionRow): Promise<Actor | null> {
  return withService(async (tx) => {
    const [u] = await tx`
      select id, email, display_name, phone, email_verified_at, phone_verified_at, mfa_enabled, is_synthetic
      from users where id = ${session.user_id} and status = 'active'`;
    if (!u) return null;
    const [patient] = await tx`select id, verification_status, status from patients where user_id = ${u.id}`;
    const [pro] = await tx`select id, full_name, profession, verification_status from healthcare_professionals where user_id = ${u.id}`;
    const affiliations = pro
      ? await tx`
          select a.id, a.institution_id, i.name, i.status as inst_status, i.institution_type, r.key, r.name as role_name,
                 r.capabilities, a.status
          from professional_affiliations a
          join healthcare_institutions i on i.id = a.institution_id
          join roles r on r.id = a.role_id
          where a.professional_id = ${pro.id} and a.status in ('active','suspended')
          order by a.created_at`
      : [];
    const drafts = await tx`select id, name, status from healthcare_institutions where created_by = ${u.id} order by created_at`;
    const roles = await tx`select r.key from user_platform_roles upr join roles r on r.id = upr.role_id where upr.user_id = ${u.id}`;
    const reps = await tx`
      select pr.patient_id, pp.full_name, pr.relationship
      from patient_representatives pr join patient_profiles pp on pp.patient_id = pr.patient_id
      where pr.representative_user_id = ${u.id} and pr.status = 'active'
        and (pr.valid_until is null or pr.valid_until > now())`;
    return {
      userId: u.id,
      sessionId: session.id,
      email: u.email,
      displayName: u.display_name,
      phone: u.phone,
      emailVerified: !!u.email_verified_at,
      phoneVerified: !!u.phone_verified_at,
      mfaEnabled: u.mfa_enabled,
      mfaVerified: session.mfa_verified,
      reauthenticatedAt: session.reauthenticated_at,
      isSynthetic: u.is_synthetic,
      patient: patient ? { id: patient.id, verificationStatus: patient.verification_status, status: patient.status } : null,
      professional: pro
        ? { id: pro.id, fullName: pro.full_name, profession: pro.profession, verificationStatus: pro.verification_status }
        : null,
      affiliations: affiliations.map((a) => ({
        id: a.id, institutionId: a.institution_id, institutionName: a.name, institutionStatus: a.inst_status,
        institutionType: a.institution_type, roleKey: a.key, roleName: a.role_name, capabilities: a.capabilities,
        status: a.status,
      })),
      ownedInstitutionDrafts: drafts.map((d) => ({ id: d.id, name: d.name, status: d.status })),
      platformRoles: roles.map((r) => r.key),
      representations: reps.map((r) => ({ patientId: r.patient_id, fullName: r.full_name, relationship: r.relationship })),
    } satisfies Actor;
  });
}

/** Current actor for this request (memoised per request). Null when signed out. */
export const getActor = cache(async (): Promise<Actor | null> => {
  const token = await readSessionCookie();
  if (!token) return null;
  const session = await validateSessionToken(token);
  if (!session) return null;
  return loadActor(session);
});

const needsMfa = (a: Actor) => a.professional !== null || a.platformRoles.length > 0;

/** Where should this person land after signing in? */
export function homeFor(a: Actor): string {
  if (a.platformRoles.length) return "/admin";
  if (a.professional || a.ownedInstitutionDrafts.length) return "/provider";
  if (a.patient || a.representations.length) return "/dashboard";
  return "/provider/institution/new";
}

/**
 * Signed-in, active, email-verified, and past any MFA challenge. Professionals
 * and administrators must have MFA enrolled before they can do anything else.
 */
export async function requireActor(opts: { next?: string; allowUnverifiedEmail?: boolean; allowMfaSetup?: boolean } = {}) {
  const actor = await getActor();
  if (!actor) redirect(`/sign-in${opts.next ? `?next=${encodeURIComponent(opts.next)}` : ""}`);
  if (!actor.emailVerified && !opts.allowUnverifiedEmail) redirect("/verify-email");
  if (actor.mfaEnabled && !actor.mfaVerified) redirect("/auth/mfa");
  if (!actor.mfaEnabled && needsMfa(actor) && !opts.allowMfaSetup) redirect("/auth/mfa/setup");
  return actor;
}

export const ACTING_PATIENT_COOKIE = "continuum_acting_for";

/**
 * Patient context: the patient's own record, or — for a verified
 * representative — the patient they chose to act for. The database
 * re-checks this with app.can_act_for_patient() on every query.
 */
export async function requirePatientContext(next = "/dashboard") {
  const actor = await requireActor({ next });
  const jar = await cookies();
  const acting = jar.get(ACTING_PATIENT_COOKIE)?.value;
  const rep = acting ? actor.representations.find((r) => r.patientId === acting) : undefined;
  if (rep) return { actor, patientId: rep.patientId, actingAs: rep };
  if (actor.patient) return { actor, patientId: actor.patient.id, actingAs: null };
  if (actor.representations[0]) return { actor, patientId: actor.representations[0].patientId, actingAs: actor.representations[0] };
  redirect(homeFor(actor));
}

export async function requirePlatformRole(roles: string[] = ["platform_admin", "security_officer", "support_agent"]) {
  const actor = await requireActor({ next: "/admin" });
  if (!actor.platformRoles.some((r) => roles.includes(r))) redirect(actor.platformRoles.length ? "/admin" : homeFor(actor));
  return actor;
}

/** Fresh re-authentication within the last 10 minutes (step-up). */
export function hasRecentReauth(actor: Actor, minutes = 10) {
  return !!actor.reauthenticatedAt && Date.now() - new Date(actor.reauthenticatedAt).getTime() < minutes * 60_000;
}
