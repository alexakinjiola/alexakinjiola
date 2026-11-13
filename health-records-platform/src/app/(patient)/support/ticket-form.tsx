"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { toast } from "@/components/ui/toast";
import { applyFieldErrors, type ClientActionResult } from "@/lib/client-action";
import { TICKET_CATEGORY } from "@/lib/labels";

type V = { category: string; subject: string; description: string };
export function TicketForm({ defaultCategory, categories, action }: {
  defaultCategory?: string; categories: string[]; action: (v: V) => Promise<ClientActionResult<{ reference: string }>>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<V>({ defaultValues: { category: defaultCategory && categories.includes(defaultCategory) ? defaultCategory : "", subject: "", description: "" } });
  const e = form.formState.errors;
  return (
    <form noValidate className="space-y-5" onSubmit={form.handleSubmit((v) => start(async () => {
      setError(null);
      const res = await action(v);
      if (res.ok) { toast.success(`${res.message} Reference ${res.data?.reference}.`); form.reset({ category: "", subject: "", description: "" }); router.refresh(); }
      else if (!applyFieldErrors(form.setError, res)) setError(res.error);
    }))}>
      <FormError message={error} />
      <Field label="What do you need help with?" error={e.category?.message} required>
        <Select {...form.register("category", { required: "Choose a topic." })}>
          <option value="" disabled>Choose a topic…</option>
          {categories.map((c) => <option key={c} value={c}>{TICKET_CATEGORY[c]}</option>)}
        </Select>
      </Field>
      <Field label="Subject" error={e.subject?.message} required><Input maxLength={200} {...form.register("subject")} /></Field>
      <Field label="Details" hint="Don't include passwords. Avoid medical details unless they're needed to resolve the issue." error={e.description?.message} required>
        <Textarea rows={5} maxLength={5000} {...form.register("description")} />
      </Field>
      <div className="flex justify-end"><Button type="submit" loading={pending} icon="send">Send request</Button></div>
    </form>
  );
}
