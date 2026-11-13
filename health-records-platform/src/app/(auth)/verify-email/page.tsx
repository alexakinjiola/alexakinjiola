import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor, homeFor } from "@/lib/auth/actor";
import { Icon } from "@/components/ui/icon";
import { ActionButton } from "@/components/ui/action-button";
import { devMailboxEnabled } from "@/lib/env";
import { resendVerificationAction, signOutAction } from "../actions";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function VerifyEmailPage() {
  const actor = await getActor();
  if (!actor) redirect("/sign-in");
  if (actor.emailVerified) redirect(homeFor(actor));
  return (
    <div className="animate-slide-up">
      <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700"><Icon name="mark_email_read" size={26} /></span>
      <p className="eyebrow mt-6">Step 2 of 3 · Confirm your email</p>
      <h1 className="mt-2 font-display text-[2rem] font-medium leading-tight text-ink">Check your inbox</h1>
      <p className="mt-3 text-[15px] leading-7 text-ink-2">
        We sent a confirmation link to <strong className="font-semibold text-ink">{actor.email}</strong>. Open it on any device to continue.
        The link expires in 24 hours.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ActionButton variant="secondary" action={resendVerificationAction} icon="send">Send a new link</ActionButton>
        <form action={signOutAction}><button className="link h-10 text-sm">Use a different account</button></form>
      </div>
      {devMailboxEnabled() && (
        <p className="mt-8 rounded-md border border-dashed border-line-strong bg-surface px-4 py-3 text-sm text-ink-3">
          Development: emails aren't sent. Open the <Link href="/dev/mailbox" className="link">development mailbox</Link> to find the link.
        </p>
      )}
    </div>
  );
}
