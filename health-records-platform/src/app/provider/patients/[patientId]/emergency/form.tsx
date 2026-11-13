"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Checkbox, CheckboxCard } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { toast } from "@/components/ui/toast";
import { CATEGORY } from "@/lib/labels";
import { emergencyAccessAction } from "../../../actions";

export function EmergencyForm({ patientId, allowed, hours }: { patientId: string; allowed: string[]; hours: number }) {
  const router = useRouter();
  const [cats, setCats] = useState<string[]>(["allergy", "prescription"].filter((c) => allowed.includes(c)));
  const [justification, setJ] = useState("");
  const [credential, setCred] = useState("");
  const [attest, setAttest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form noValidate className="space-y-6" onSubmit={(e) => { e.preventDefault(); setError(null); start(async () => {
      const res = await emergencyAccessAction({ patientId, justification, categories: cats, credential: credential || undefined, attest });
      if (!res.ok) { setError(Object.values(res.fieldErrors ?? {})[0] ?? res.error); return; }
      toast.success(res.message!); router.push(`/provider/patients/${patientId}`); router.refresh();
    }); }}>
      <Field label="Clinical justification" hint="Describe the emergency and why the patient (or their representative) can't be asked. Minimum 40 characters. This is reviewed." required>
        <Textarea rows={4} value={justification} onChange={(e) => setJ(e.target.value)} maxLength={2000} />
      </Field>
      <fieldset>
        <legend className="text-sm font-medium text-ink">Minimum necessary information</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {allowed.map((c) => <CheckboxCard key={c} id={`e-${c}`} label={CATEGORY[c]?.label} checked={cats.includes(c)} onCheckedChange={(v) => setCats((s) => v ? [...s, c] : s.filter((x) => x !== c))} />)}
        </div>
      </fieldset>
      <Field label="Authenticator code" hint="Required to confirm it's you."><Input inputMode="numeric" autoComplete="one-time-code" value={credential} onChange={(e) => setCred(e.target.value)} /></Field>
      <div className="flex items-start gap-3">
        <Checkbox id="attest" checked={attest} onCheckedChange={(v) => setAttest(v === true)} className="mt-0.5" />
        <label htmlFor="attest" className="text-sm leading-6 text-ink-2">I declare this is a genuine emergency, the information is needed now for this patient's care, and I understand this access will be reviewed and the patient notified. Misuse may lead to suspension.</label>
      </div>
      <FormError message={error} />
      <Button type="submit" variant="danger" size="lg" icon="emergency" loading={pending}>Open emergency access for {hours} hours</Button>
    </form>
  );
}
