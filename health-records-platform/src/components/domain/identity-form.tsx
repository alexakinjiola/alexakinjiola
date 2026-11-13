"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Callout } from "@/components/ui/callout";
import { FormError } from "@/components/ui/form-error";
import { RadioCards } from "@/components/ui/radio-group";
import { inPersonVerificationAction, verifyNinAction } from "@/app/(patient)/actions";

export function IdentityForm({ done }: { done: string }) {
  const router = useRouter();
  const [method, setMethod] = useState("nin");
  const [nin, setNin] = useState("");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (result) {
    const map: Record<string, { tone: "success" | "warning" | "danger"; title: string; body: string }> = {
      verified: { tone: "success", title: "Identity verified", body: "Thank you. Hospitals can now find you with your Health ID and send you requests." },
      pending: { tone: "warning", title: "We're checking your details", body: "This usually takes a short while. We'll notify you when it's done." },
      failed: { tone: "danger", title: "We couldn't verify those details", body: "Check your NIN matches the name and date of birth on your account, or choose in-person verification." },
    };
    const m = map[result] ?? map.pending;
    return (
      <div className="space-y-5">
        <Callout tone={m.tone} title={m.title} role="status">{m.body}</Callout>
        {result === "failed" ? <Button variant="secondary" onClick={() => setResult(null)}>Try again</Button>
          : <Button onClick={() => { router.push(done); router.refresh(); }}>Continue</Button>}
      </div>
    );
  }

  return (
    <form className="space-y-6" noValidate onSubmit={(e) => {
      e.preventDefault(); setError(null);
      start(async () => {
        if (method === "nin") {
          const res = await verifyNinAction({ nin, consent });
          if (res.ok) setResult(res.data!.status); else setError(res.fieldErrors?.nin ?? res.fieldErrors?.consent ?? res.error);
        } else {
          const res = await inPersonVerificationAction({ note });
          if (res.ok) setResult("pending"); else setError(res.error);
        }
      });
    }}>
      <RadioCards name="method" ariaLabel="Verification method" value={method} onValueChange={setMethod} options={[
        { value: "nin", label: "Use my National Identification Number (NIN)", description: "Fastest. We check it with an approved identity service." },
        { value: "in_person", label: "I don't have my NIN, or I can't do this online", description: "Verify in person at a participating facility, or with help from our support team." },
      ]} />
      {method === "nin" ? (
        <>
          <Field label="NIN" hint="11 digits, from your NIN slip or the NIMC app. We store only a protected fingerprint of it and the last 4 digits.">
            <Input inputMode="numeric" autoComplete="off" value={nin} maxLength={11} onChange={(e) => setNin(e.target.value.replace(/\D/g, ""))} className="font-mono tracking-[0.2em]" />
          </Field>
          <div className="flex items-start gap-3">
            <Checkbox id="idv-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
            <label htmlFor="idv-consent" className="text-sm leading-6 text-ink-2">I agree to my name, date of birth and NIN being checked with an approved identity verification service for this purpose only.</label>
          </div>
        </>
      ) : (
        <Field label="Anything we should know?" hint="For example, which town you live in so we can suggest a nearby facility." optional>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        </Field>
      )}
      <FormError message={error} />
      <Button type="submit" size="lg" loading={pending}>{method === "nin" ? "Verify my identity" : "Request in-person verification"}</Button>
    </form>
  );
}
