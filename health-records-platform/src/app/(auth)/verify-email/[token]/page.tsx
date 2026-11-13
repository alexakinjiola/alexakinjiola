import type { Metadata } from "next";
import Link from "next/link";
import { verifyEmailToken } from "@/server/auth";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Email confirmation" };

export default async function VerifyTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ok = await verifyEmailToken(token);
  return (
    <div className="animate-slide-up">
      <span className={`grid size-12 place-items-center rounded-full ${ok ? "bg-success-bg text-success-fg" : "bg-danger-bg text-danger-fg"}`}>
        <Icon name={ok ? "check_circle" : "link_off"} size={26} filled />
      </span>
      <h1 className="mt-6 font-display text-[2rem] font-medium leading-tight text-ink">{ok ? "Email confirmed" : "This link no longer works"}</h1>
      <p className="mt-3 text-[15px] leading-7 text-ink-2">
        {ok ? "Thanks — your email address is confirmed. Let's finish setting up your account."
          : "It may have expired or already been used. Sign in and we'll send you a new one."}
      </p>
      <Button asChild size="lg" className="mt-8"><Link href="/home">{ok ? "Continue" : "Go to sign in"}</Link></Button>
    </div>
  );
}
