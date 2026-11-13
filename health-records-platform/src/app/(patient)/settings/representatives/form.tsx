"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { FormError } from "@/components/ui/form-error";
import { applyFieldErrors } from "@/lib/client-action";
import { requestRepresentationAction } from "../../actions";

type V = { healthId: string; dateOfBirth: string; relationship: string; note: string };
export function RepresentationForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const form = useForm<V>({ defaultValues: { healthId: "", dateOfBirth: "", relationship: "parent", note: "" } });
  const e = form.formState.errors;
  if (ref) return (
    <Callout tone="success" role="status" title="Request received">
      Reference <span className="font-mono">{ref}</span>. Our team will contact you to check legal documents (for example a birth certificate or court order).
      Nothing changes until that check is complete, and the person — where able — is notified.
    </Callout>
  );
  return (
    <form noValidate className="space-y-5" onSubmit={form.handleSubmit((v) => start(async () => {
      setError(null);
      const res = await requestRepresentationAction(v);
      if (res.ok) { setRef(res.data!.reference); router.refresh(); } else if (!applyFieldErrors(form.setError, res)) setError(res.error);
    }))}>
      <FormError message={error} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Their Health ID" hint="From their account or registration slip." error={e.healthId?.message} required>
          <Input className="font-mono tracking-wider" placeholder="NG 0000 0000 00" {...form.register("healthId")} /></Field>
        <Field label="Their date of birth" error={e.dateOfBirth?.message} required><Input type="date" {...form.register("dateOfBirth")} /></Field>
      </div>
      <Field label="Your relationship" required>
        <Select {...form.register("relationship")}>
          <option value="parent">Parent of a child</option><option value="legal_guardian">Legal guardian</option>
          <option value="court_appointed_representative">Court-appointed representative</option><option value="power_of_attorney">Power of attorney</option>
        </Select>
      </Field>
      <Field label="Anything our team should know" hint="Which documents you can provide, and how best to reach you." optional>
        <Textarea rows={3} maxLength={500} {...form.register("note")} /></Field>
      <div className="flex justify-end"><Button type="submit" loading={pending} icon="send">Send request</Button></div>
    </form>
  );
}
