import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePatientContext } from "@/lib/auth/actor";
import { Card, CardBody } from "@/components/ui/card";
import { IdentityForm } from "@/components/domain/identity-form";

export const metadata: Metadata = { title: "Verify your identity" };

export default async function OnboardingIdentity() {
  const { actor } = await requirePatientContext("/onboarding/identity");
  if (!actor.patient || actor.patient.verificationStatus !== "unverified") redirect("/dashboard");
  return (
    <div className="mx-auto max-w-2xl animate-slide-up">
      <p className="eyebrow">Step 3 of 3 · Verify your identity</p>
      <h1 className="mt-2 font-display text-[2.25rem] font-medium leading-tight text-ink">One last check</h1>
      <p className="mt-2 text-[15px] leading-7 text-ink-3">
        Verifying your identity stops anyone else creating a record in your name, and lets hospitals send your records to the right person.
      </p>
      <Card className="mt-8"><CardBody className="sm:p-8"><IdentityForm done="/dashboard" /></CardBody></Card>
      <p className="mt-6 text-center text-sm text-ink-3"><Link href="/dashboard" className="link">Skip for now</Link> — you can still upload your own documents.</p>
    </div>
  );
}
