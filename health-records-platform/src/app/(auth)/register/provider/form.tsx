"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { providerAccountSchema } from "@/lib/validation/auth";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { applyFieldErrors } from "@/lib/client-action";
import { registerProviderAction } from "../../actions";

type Values = z.input<typeof providerAccountSchema>;

export function ProviderAccountForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(providerAccountSchema),
    defaultValues: { fullName: "", email: "", phone: "", password: "", confirmPassword: "", acceptTerms: false as unknown as true },
  });
  const e = form.formState.errors;
  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    start(async () => {
      const res = await registerProviderAction(values);
      if (!res.ok) { if (!applyFieldErrors(form.setError, res)) setError(res.error); return; }
      router.push(res.data!.redirect);
      router.refresh();
    });
  });
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={error} />
      <Field label="Your full name" hint="You'll be the authorised representative for the application." error={e.fullName?.message} required>
        <Input autoComplete="name" {...form.register("fullName")} />
      </Field>
      <Field label="Work email" error={e.email?.message} required>
        <Input type="email" autoComplete="email" {...form.register("email")} />
      </Field>
      <Field label="Phone number" error={e.phone?.message} required>
        <Input type="tel" autoComplete="tel" placeholder="0803 123 4567" {...form.register("phone")} />
      </Field>
      <Field label="Password" hint="At least 10 characters, with a number or symbol." error={e.password?.message} required>
        <PasswordInput autoComplete="new-password" {...form.register("password")} />
      </Field>
      <Field label="Confirm password" error={e.confirmPassword?.message} required>
        <PasswordInput autoComplete="new-password" {...form.register("confirmPassword")} />
      </Field>
      <div>
        <div className="flex items-start gap-3">
          <Controller control={form.control} name="acceptTerms" render={({ field }) => (
            <Checkbox id="acceptTerms" checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5"
              aria-invalid={!!e.acceptTerms} aria-describedby={e.acceptTerms ? "acceptTerms-error" : undefined} />
          )} />
          <label htmlFor="acceptTerms" className="text-sm leading-6 text-ink-2">
            I confirm I'm authorised to register my institution and accept the <Link href="/privacy" className="link" target="_blank">data protection terms</Link>.
          </label>
        </div>
        {e.acceptTerms && <p id="acceptTerms-error" className="mt-1.5 text-[13px] font-medium text-danger-600">{e.acceptTerms.message}</p>}
      </div>
      <Button type="submit" size="lg" block loading={pending}>Create provider account</Button>
    </form>
  );
}
