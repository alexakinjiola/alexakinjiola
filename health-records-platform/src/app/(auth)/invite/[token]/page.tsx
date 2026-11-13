import type { Metadata } from "next";
import Link from "next/link";
import { getActor } from "@/lib/auth/actor";
import { withService } from "@/lib/db";
import { sha256Hex } from "@/lib/crypto";
import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";
import { AcceptForm } from "./form";

export const metadata: Metadata = { title: "Accept invitation" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [inv] = /^[A-Za-z0-9_-]{30,64}$/.test(token) ? await withService((tx) => tx`
    select i.email, i.full_name, i.status, i.expires_at > now() as live, h.name as institution, r.name as role
    from staff_invitations i join healthcare_institutions h on h.id = i.institution_id join roles r on r.id = i.role_id
    where i.token_hash = ${sha256Hex(token)}`) : [];
  const actor = await getActor();
  if (!inv || inv.status !== "pending" || !inv.live) {
    return <div><h1 className="font-display text-[2rem] font-medium text-ink">Invitation unavailable</h1>
      <p className="mt-2 text-ink-3">This invitation has expired or was already used. Ask your institution administrator to send a new one.</p></div>;
  }
  const next = encodeURIComponent(`/invite/${token}`);
  return (
    <div className="animate-slide-up">
      <p className="eyebrow">Staff invitation</p>
      <h1 className="mt-2 font-display text-[2rem] font-medium leading-tight text-ink">Join {inv.institution}</h1>
      <p className="mt-2 text-[15px] text-ink-3">You've been invited as <strong className="text-ink">{inv.role}</strong>.</p>
      <div className="mt-8">
        {!actor ? (
          <div className="space-y-4">
            <Callout tone="info">Sign in or create an account using <strong>{inv.email}</strong> to accept.</Callout>
            <div className="flex gap-2"><Button asChild><Link href={`/sign-in?next=${next}`}>Sign in</Link></Button>
              <Button asChild variant="secondary"><Link href="/register/provider">Create account</Link></Button></div>
            <p className="text-sm text-ink-3">After creating your account and confirming your email, open this invitation link again.</p>
          </div>
        ) : actor.email !== inv.email ? (
          <Callout tone="danger" title="Wrong account">You're signed in as {actor.email}. This invitation is for {inv.email}.</Callout>
        ) : !actor.emailVerified ? (
          <Callout tone="warning" title="Confirm your email first"><Link href="/verify-email" className="underline">Confirm your email address</Link>, then return to this link.</Callout>
        ) : <AcceptForm token={token} name={inv.full_name} />}
      </div>
    </div>
  );
}
