import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./form";

export const metadata: Metadata = { title: "Create your account" };

export default function RegisterPage() {
  return (
    <div className="animate-slide-up">
      <p className="eyebrow">Step 1 of 3 · Your details</p>
      <h1 className="mt-2 font-display text-[2rem] font-medium leading-tight text-ink">Create your health record</h1>
      <p className="mt-2 text-[15px] text-ink-3">It's free, and nothing is shared with any hospital unless you approve it.</p>
      <div className="mt-8"><RegisterForm /></div>
      <p className="mt-8 border-t border-line pt-6 text-sm text-ink-3">
        Already registered? <Link href="/sign-in" className="link">Sign in</Link>
      </p>
    </div>
  );
}
