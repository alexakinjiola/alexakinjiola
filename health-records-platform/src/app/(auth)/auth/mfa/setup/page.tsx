import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActor, homeFor } from "@/lib/auth/actor";
import { Callout } from "@/components/ui/callout";
import { MfaSetup } from "./setup";

export const metadata: Metadata = { title: "Set up two-step verification" };

export default async function MfaSetupPage() {
  const actor = await getActor();
  if (!actor) redirect("/sign-in");
  if (!actor.emailVerified) redirect("/verify-email");
  if (actor.mfaEnabled) redirect(homeFor(actor));
  const required = !!actor.professional || actor.platformRoles.length > 0 || actor.ownedInstitutionDrafts.length > 0 || !actor.patient;
  return (
    <div className="animate-slide-up">
      <p className="eyebrow">Account security</p>
      <h1 className="mt-2 font-display text-[2rem] font-medium leading-tight text-ink">Set up two-step verification</h1>
      <p className="mt-2 text-[15px] text-ink-3">Each time you sign in you'll enter a code from your phone as well as your password.</p>
      {required && (
        <Callout tone="info" className="mt-6">
          Two-step verification is required for accounts that can see other people's health information.
        </Callout>
      )}
      <div className="mt-8"><MfaSetup /></div>
    </div>
  );
}
