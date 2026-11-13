import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActor, homeFor } from "@/lib/auth/actor";
import { Icon } from "@/components/ui/icon";
import { OtpForm } from "./form";
import { mfaChallengeAction, signOutAction } from "../../actions";

export const metadata: Metadata = { title: "Two-step verification" };

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const actor = await getActor();
  if (!actor) redirect("/sign-in");
  if (!actor.mfaEnabled || actor.mfaVerified) redirect(homeFor(actor));
  const { next } = await searchParams;
  return (
    <div className="animate-slide-up">
      <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700"><Icon name="password" size={26} /></span>
      <h1 className="mt-6 font-display text-[2rem] font-medium leading-tight text-ink">Enter your code</h1>
      <p className="mt-2 text-[15px] text-ink-3">Open your authenticator app and enter the 6-digit code for {process.env.NEXT_PUBLIC_PLATFORM_NAME ?? "Continuum"}.</p>
      <div className="mt-8"><OtpForm action={mfaChallengeAction} submitLabel="Verify and continue" next={next} /></div>
      <div className="mt-8 border-t border-line pt-6 text-sm text-ink-3">
        <p>Lost your phone? Contact support from another device — we'll verify your identity before restoring access.</p>
        <form action={signOutAction} className="mt-3"><button className="link">Sign out</button></form>
      </div>
    </div>
  );
}
