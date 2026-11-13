import "server-only";
import { withService } from "@/lib/db";
import { hashIdentifier } from "@/lib/crypto";
import { identityProvider } from "@/lib/identity";
import { AppError } from "@/lib/errors";
import type { Actor } from "@/lib/auth/actor";

/**
 * Identity verification (FR-003). Runs in the trusted service context because
 * it writes identifiers and verification status that patients must not be able
 * to set themselves. Only a keyed hash and the last 4 digits of the NIN are kept.
 */
export async function submitNinVerification(actor: Actor, nin: string) {
  if (!actor.patient) throw new AppError(403, "Only patients can verify their identity here.");
  if (actor.patient.verificationStatus === "verified") throw new AppError(409, "Your identity is already verified.");
  const clean = nin.replace(/\s/g, "");
  if (!/^\d{11}$/.test(clean)) throw new AppError(400, "Your NIN is 11 digits.");
  const ninHash = hashIdentifier(clean);
  const patientId = actor.patient.id;

  const profile = await withService(async (tx) => {
    const [p] = await tx`select full_name, date_of_birth::text as dob from patient_profiles where patient_id = ${patientId}`;
    const [taken] = await tx`select patient_id from health_identifiers where identifier_type = 'nin' and value_hash = ${ninHash} and patient_id <> ${patientId}`;
    return { full_name: p.full_name as string, dob: p.dob as string, takenBy: taken?.patient_id as string | undefined };
  });

  const provider = identityProvider();
  const result = profile.takenBy
    ? { status: "pending" as const, reference: "DUPLICATE-CHECK", reason: "This NIN is linked to another account and needs review." }
    : await provider.verifyNin({ nin: clean, fullName: profile.full_name, dateOfBirth: profile.dob });

  await withService(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: actor.userId, role: "service_role" })}, true)`;
    await tx`delete from health_identifiers where patient_id = ${patientId} and identifier_type = 'nin'`;
    if (!profile.takenBy) {
      await tx`insert into health_identifiers(patient_id, identifier_type, value_hash, display_hint)
               values (${patientId}, 'nin', ${ninHash}, ${clean.slice(-4)})`;
    }
    const status = result.status === "pending" ? (profile.takenBy ? "under_review" : "pending") : result.status;
    await tx`insert into identity_verifications(user_id, patient_id, provider, method, status, provider_reference, failure_reason, decided_at)
             values (${actor.userId}, ${patientId}, ${profile.takenBy ? "duplicate_check" : provider.name}, 'nin', ${status},
                     ${result.reference}, ${"reason" in result ? result.reason : null}, ${result.status === "pending" ? null : tx`now()`})`;
    await tx`update patients set verification_status = ${status}, verified_at = ${status === "verified" ? tx`now()` : null} where id = ${patientId}`;
    if (profile.takenBy) {
      await tx`insert into support_tickets(reference, requester_user_id, requester_type, patient_id, category, subject, description, priority)
               values (app.short_ref('SUP'), ${actor.userId}, 'patient', ${patientId}, 'identity_reconciliation', 'NIN already linked to another account',
                       'Automatic check: the NIN submitted matches an identifier already linked to a different patient. Possible duplicate account or identity misuse. Do not merge automatically.', 'high')`;
    }
    await tx`select app.audit('identity.submitted', 'patient', ${patientId}, ${patientId}::uuid, null, ${tx.json({ status, provider: provider.name })}::jsonb)`;
  });
  return result.status === "pending" ? "pending" : result.status;
}

export async function requestInPersonVerification(actor: Actor, note: string) {
  if (!actor.patient) throw new AppError(403, "Only patients can verify their identity here.");
  await withService(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: actor.userId, role: "service_role" })}, true)`;
    await tx`insert into identity_verifications(user_id, patient_id, provider, method, status, provider_reference)
             values (${actor.userId}, ${actor.patient!.id}, 'manual_review', 'in_person', 'pending', ${note.slice(0, 200) || null})`;
    await tx`update patients set verification_status = 'pending' where id = ${actor.patient!.id} and verification_status <> 'verified'`;
    await tx`select app.audit('identity.in_person_requested', 'patient', ${actor.patient!.id}, ${actor.patient!.id}::uuid, null, '{}'::jsonb)`;
  });
}
