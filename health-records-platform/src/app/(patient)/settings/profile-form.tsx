"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { toast } from "@/components/ui/toast";
import { applyFieldErrors } from "@/lib/client-action";
import { updateProfileAction } from "../actions";

const STATES = ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"];

type V = { phone: string; addressLine: string; stateOfResidence: string; lga: string; preferredLanguage: string; emergencyContactName: string; emergencyContactPhone: string; emergencyContactRelationship: string };

export function ProfileForm({ initial }: { initial: V }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<V>({ defaultValues: initial });
  const e = form.formState.errors;
  return (
    <form noValidate className="space-y-8" onSubmit={form.handleSubmit((v) => start(async () => {
      setError(null);
      const res = await updateProfileAction(v);
      if (res.ok) { toast.success(res.message!); router.refresh(); form.reset(v); }
      else if (!applyFieldErrors(form.setError, res)) setError(res.error);
    }))}>
      <FormError message={error} />
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-4 text-sm font-semibold text-ink">Contact & address</legend>
        <Field label="Phone number" error={e.phone?.message} optional><Input type="tel" autoComplete="tel" {...form.register("phone")} /></Field>
        <Field label="Preferred language" hint="For future translated content.">
          <Select {...form.register("preferredLanguage")}>
            <option value="en">English</option><option value="pcm">Nigerian Pidgin</option><option value="yo">Yorùbá</option><option value="ig">Igbo</option><option value="ha">Hausa</option>
          </Select>
        </Field>
        <Field label="Address" className="sm:col-span-2" optional><Input autoComplete="street-address" {...form.register("addressLine")} /></Field>
        <Field label="State of residence" optional>
          <Select {...form.register("stateOfResidence")}><option value="">Choose…</option>{STATES.map((s) => <option key={s}>{s}</option>)}</Select>
        </Field>
        <Field label="Local government area" optional><Input {...form.register("lga")} /></Field>
      </fieldset>
      <fieldset className="grid gap-5 border-t border-line pt-8 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-semibold text-ink">Emergency contact</legend>
        <p className="-mt-1 text-sm text-ink-3 sm:col-span-2">Someone we can tell hospitals to reach if you can't speak for yourself. They don't get access to your records.</p>
        <Field label="Name" optional><Input {...form.register("emergencyContactName")} /></Field>
        <Field label="Relationship" optional><Input placeholder="e.g. Sister" {...form.register("emergencyContactRelationship")} /></Field>
        <Field label="Phone number" error={e.emergencyContactPhone?.message} optional><Input type="tel" {...form.register("emergencyContactPhone")} /></Field>
      </fieldset>
      <div className="flex justify-end border-t border-line pt-5">
        <Button type="submit" loading={pending} disabled={!form.formState.isDirty}>Save changes</Button>
      </div>
    </form>
  );
}
