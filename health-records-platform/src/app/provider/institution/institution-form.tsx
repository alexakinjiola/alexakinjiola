"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { toast } from "@/components/ui/toast";
import { applyFieldErrors } from "@/lib/client-action";
import { INSTITUTION_TYPE } from "@/lib/labels";
import { saveInstitutionAction } from "../actions";

const STATES = ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"];
export type InstitutionValues = Record<"name" | "institution_type" | "registration_number" | "license_number" | "license_authority" | "license_expires_on" |
  "address_line" | "city" | "state" | "lga" | "email" | "phone" | "website" | "representative_name" | "representative_title" | "representative_email" | "representative_phone", string>;

export function InstitutionForm({ initial, institutionId, disabled }: { initial: InstitutionValues; institutionId?: string; disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<InstitutionValues>({ defaultValues: initial });
  const e = form.formState.errors;
  const r = form.register;
  return (
    <form noValidate className="space-y-10" onSubmit={form.handleSubmit((v) => start(async () => {
      setError(null);
      const res = await saveInstitutionAction(v, institutionId);
      if (!res.ok) { if (!applyFieldErrors(form.setError, res)) setError(res.error); return; }
      toast.success(institutionId ? "Changes saved." : "Institution created. Now upload your documents.");
      router.push("/provider/institution"); router.refresh();
    }))}>
      <FormError message={error} />
      <fieldset disabled={disabled} className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-4 text-base font-semibold text-ink">Institution</legend>
        <Field label="Registered name" error={e.name?.message} className="sm:col-span-2" required><Input {...r("name")} /></Field>
        <Field label="Type" error={e.institution_type?.message} required>
          <Select {...r("institution_type")}><option value="" disabled>Choose…</option>{Object.entries(INSTITUTION_TYPE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        </Field>
        <Field label="Registration number" hint="CAC or facility registration number." error={e.registration_number?.message} required><Input {...r("registration_number")} /></Field>
        <Field label="Operating licence number" error={e.license_number?.message} required><Input {...r("license_number")} /></Field>
        <Field label="Licensing authority" hint="For example, the State Ministry of Health or HEFAMAA." error={e.license_authority?.message} required><Input {...r("license_authority")} /></Field>
        <Field label="Licence expiry date" optional><Input type="date" {...r("license_expires_on")} /></Field>
      </fieldset>
      <fieldset disabled={disabled} className="grid gap-5 border-t border-line pt-8 sm:grid-cols-2">
        <legend className="mb-4 text-base font-semibold text-ink">Address & contact</legend>
        <Field label="Street address" error={e.address_line?.message} className="sm:col-span-2" required><Input autoComplete="street-address" {...r("address_line")} /></Field>
        <Field label="City or town" error={e.city?.message} required><Input {...r("city")} /></Field>
        <Field label="State" error={e.state?.message} required>
          <Select {...r("state")}><option value="" disabled>Choose…</option>{STATES.map((s) => <option key={s}>{s}</option>)}</Select>
        </Field>
        <Field label="LGA" optional><Input {...r("lga")} /></Field>
        <Field label="General email" error={e.email?.message} required><Input type="email" {...r("email")} /></Field>
        <Field label="General phone" error={e.phone?.message} required><Input type="tel" {...r("phone")} /></Field>
        <Field label="Website" optional><Input type="url" placeholder="https://" {...r("website")} /></Field>
      </fieldset>
      <fieldset disabled={disabled} className="grid gap-5 border-t border-line pt-8 sm:grid-cols-2">
        <legend className="mb-1 text-base font-semibold text-ink">Authorised representative</legend>
        <p className="-mt-1 text-sm text-ink-3 sm:col-span-2">The person accountable for your institution's use of the platform, usually the Medical Director or CMD.</p>
        <Field label="Full name" error={e.representative_name?.message} required><Input {...r("representative_name")} /></Field>
        <Field label="Job title" error={e.representative_title?.message} required><Input {...r("representative_title")} /></Field>
        <Field label="Email" error={e.representative_email?.message} required><Input type="email" {...r("representative_email")} /></Field>
        <Field label="Phone" error={e.representative_phone?.message} required><Input type="tel" {...r("representative_phone")} /></Field>
      </fieldset>
      {!disabled && <div className="flex justify-end border-t border-line pt-6"><Button type="submit" size="lg" loading={pending}>{institutionId ? "Save changes" : "Create institution"}</Button></div>}
    </form>
  );
}
