import { redirect } from "next/navigation";
import { getActor, homeFor } from "@/lib/auth/actor";

/** Routes each signed-in person to the right application. */
export default async function Home() {
  const actor = await getActor();
  if (!actor) redirect("/sign-in");
  if (!actor.emailVerified) redirect("/verify-email");
  if (actor.mfaEnabled && !actor.mfaVerified) redirect("/auth/mfa");
  const privileged = !!actor.professional || actor.platformRoles.length > 0 || (!actor.patient && actor.representations.length === 0);
  if (privileged && !actor.mfaEnabled) redirect("/auth/mfa/setup");
  if (actor.patient && actor.patient.verificationStatus === "unverified" && !actor.professional && !actor.platformRoles.length) {
    redirect("/onboarding/identity");
  }
  redirect(homeFor(actor));
}
