import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor, homeFor } from "@/lib/auth/actor";
import { Callout } from "@/components/ui/callout";
import { SignInForm } from "./form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; signed_out?: string; reset?: string }> }) {
  const sp = await searchParams;
  const actor = await getActor();
  if (actor && (!actor.mfaEnabled || actor.mfaVerified)) redirect(homeFor(actor));
  return (
    <div className="animate-slide-up">
      <h1 className="font-display text-[2rem] font-medium leading-tight text-ink">Welcome back</h1>
      <p className="mt-2 text-[15px] text-ink-3">Sign in to see your records and manage who can access them.</p>
      <div className="mt-8 space-y-5">
        {sp.signed_out && <Callout tone="success" role="status">You've been signed out.</Callout>}
        {sp.reset && <Callout tone="success" role="status">Password updated. Sign in with your new password.</Callout>}
        <SignInForm next={sp.next} />
      </div>
      <div className="mt-8 space-y-2 border-t border-line pt-6 text-sm text-ink-3">
        <p>New here? <Link href="/register" className="link">Create a patient account</Link></p>
        <p>Healthcare institution? <Link href="/register/provider" className="link">Register your institution</Link></p>
      </div>
    </div>
  );
}
