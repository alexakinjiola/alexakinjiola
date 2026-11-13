import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/callout";
import { ProviderAccountForm } from "./form";

export const metadata: Metadata = { title: "Register your institution" };

export default function ProviderRegisterPage() {
  return (
    <div className="animate-slide-up">
      <p className="eyebrow">For hospitals, clinics and laboratories</p>
      <h1 className="mt-2 font-display text-[2rem] font-medium leading-tight text-ink">Register your institution</h1>
      <p className="mt-2 text-[15px] text-ink-3">
        Start with your own account. Next you'll add your institution's licence details and documents for verification.
      </p>
      <Callout tone="info" className="mt-6">
        Staff joining an institution that is already registered should use the invitation link their administrator sends instead.
      </Callout>
      <div className="mt-6"><ProviderAccountForm /></div>
      <p className="mt-8 border-t border-line pt-6 text-sm text-ink-3">Already have an account? <Link href="/sign-in" className="link">Sign in</Link></p>
    </div>
  );
}
