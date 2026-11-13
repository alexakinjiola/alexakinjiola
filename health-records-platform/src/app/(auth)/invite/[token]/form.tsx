"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { applyFieldErrors } from "@/lib/client-action";
import { LICENSE_BODIES, PROFESSION } from "@/lib/labels";
import { acceptInvitationAction } from "@/app/provider/actions";

type V = { fullName: string; profession: string; licenseBody: string; licenseNumber: string; licenseExpires: string };
export function AcceptForm({ token, name }: { token: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<V>({ defaultValues: { fullName: name, profession: "medical_doctor", licenseBody: "MDCN", licenseNumber: "", licenseExpires: "" } });
  const e = form.formState.errors;
  const admin = form.watch("profession") === "administrator";
  return (
    <form noValidate className="space-y-5" onSubmit={form.handleSubmit((v) => start(async () => {
      setError(null);
      const res = await acceptInvitationAction({ ...v, token });
      if (!res.ok) { if (!applyFieldErrors(form.setError, res)) setError(res.error); return; }
      router.push(res.data!.redirect); router.refresh();
    }))}>
      <FormError message={error} />
      <Field label="Full name" error={e.fullName?.message} required><Input {...form.register("fullName")} /></Field>
      <Field label="Profession" required><Select {...form.register("profession")}>{Object.entries(PROFESSION).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
      {!admin && <>
        <Field label="Licensing body" required><Select {...form.register("licenseBody")}>{LICENSE_BODIES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}</Select></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Licence / registration number" error={e.licenseNumber?.message} required><Input {...form.register("licenseNumber")} /></Field>
          <Field label="Licence expiry" optional><Input type="date" {...form.register("licenseExpires")} /></Field>
        </div>
      </>}
      <Button type="submit" size="lg" block loading={pending}>Join institution</Button>
    </form>
  );
}
