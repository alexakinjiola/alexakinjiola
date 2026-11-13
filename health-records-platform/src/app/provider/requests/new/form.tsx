"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { CheckboxCard } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { toast } from "@/components/ui/toast";
import { applyFieldErrors } from "@/lib/client-action";
import { CATEGORY, CATEGORY_KEYS, PURPOSE } from "@/lib/labels";
import { createAccessRequestAction } from "../../actions";

type V = { purpose: string; purposeDetail: string; categories: string[]; dateFrom: string; dateTo: string; durationDays: number };

export function RequestForm({ patientId, maxDays }: { patientId: string; maxDays: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<V>({ defaultValues: { purpose: "", purposeDetail: "", categories: [], dateFrom: "", dateTo: "", durationDays: 30 } });
  const e = form.formState.errors;
  return (
    <form noValidate className="space-y-7" onSubmit={form.handleSubmit((v) => start(async () => {
      setError(null);
      const res = await createAccessRequestAction({ ...v, patientId });
      if (!res.ok) { if (!applyFieldErrors(form.setError, res)) setError(res.error); return; }
      toast.success(res.message!); router.push("/provider/requests"); router.refresh();
    }))}>
      <FormError message={error} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Purpose of access" error={e.purpose?.message} required>
          <Select {...form.register("purpose")}><option value="" disabled>Choose…</option>
            {Object.entries(PURPOSE).filter(([k]) => k !== "emergency_care").map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}</Select>
        </Field>
        <Field label="Duration" hint={`Up to ${maxDays} days. Ask for the shortest time you need.`} error={e.durationDays?.message} required>
          <Select {...form.register("durationDays", { valueAsNumber: true })}>
            {[1, 3, 7, 14, 30, 60, 90, 180, 365].filter((d) => d <= maxDays).map((d) => <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Clinical reason" hint="The patient reads this before deciding. Be specific and plain — avoid abbreviations." error={e.purposeDetail?.message} required>
        <Textarea rows={3} maxLength={1000} {...form.register("purposeDetail")} />
      </Field>
      <fieldset>
        <legend className="text-sm font-medium text-ink">Record categories needed</legend>
        <p className="mt-0.5 text-[13px] text-ink-3">Request only what you need. The patient can approve some categories and decline others.</p>
        {e.categories && <p className="mt-1 text-[13px] font-medium text-danger-600">{e.categories.message}</p>}
        <Controller control={form.control} name="categories" render={({ field }) => (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CATEGORY_KEYS.map((k) => (
              <CheckboxCard key={k} id={`c-${k}`} label={CATEGORY[k].label} checked={field.value.includes(k)}
                onCheckedChange={(on) => field.onChange(on ? [...field.value, k] : field.value.filter((x) => x !== k))} />
            ))}
          </div>
        )} />
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Records from" hint="Leave blank for all dates" optional><Input type="date" {...form.register("dateFrom")} /></Field>
        <Field label="Records up to" optional><Input type="date" {...form.register("dateTo")} /></Field>
      </div>
      <div className="flex justify-end border-t border-line pt-6"><Button type="submit" size="lg" icon="send" loading={pending}>Send request to patient</Button></div>
    </form>
  );
}
