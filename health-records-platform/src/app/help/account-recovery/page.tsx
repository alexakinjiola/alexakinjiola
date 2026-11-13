import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/shell/public-shell";

export const metadata: Metadata = { title: "Account recovery" };

const CASES = [
  ["I forgot my password", <>Use <Link href="/forgot-password" className="link">reset your password</Link>. The link goes to your registered email and expires in 30 minutes.</>],
  ["I lost my phone or authenticator app", "Contact support from any device. We'll verify your identity (for example with your NIN and date of birth, or in person at a participating facility) before resetting two-step verification. We never reset it on the strength of a phone call alone."],
  ["I no longer have access to my email or phone number", "Visit a participating facility with valid ID, or contact support. A platform officer will check your identity before updating your contact details, and you'll be notified at both old and new addresses."],
  ["I don't have a smartphone", "You can use any web browser, including on a shared or basic device. Always sign out afterwards. Participating facilities can help you register and verify in person."],
  ["I think I have two accounts", "Tell support. Accounts are never merged automatically — our team reconciles them after checking your identity, so no one can claim your records by mistake."],
] as const;

export default function Recovery() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
        <h1 className="font-display text-[2.25rem] font-medium text-ink">Getting back into your account</h1>
        <dl className="mt-10 space-y-8">
          {CASES.map(([q, a]) => <div key={q}><dt className="text-lg font-semibold text-ink">{q}</dt><dd className="mt-2 leading-7 text-ink-2">{a}</dd></div>)}
        </dl>
      </article>
    </PublicShell>
  );
}
