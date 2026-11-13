"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { patientRegistrationSchema } from "@/lib/validation/auth";
import { Field, Input, Select } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { applyFieldErrors } from "@/lib/client-action";
import { registerPatientAction } from "../actions";

type Values = z.input<typeof patientRegistrationSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: { fullName: "", dateOfBirth: "", sex: undefined, email: "", phone: "", password: "", confirmPassword: "", acceptTerms: false as unknown as true },
  });
  const e = form.formState.errors;

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    start(async () => {
      const res = await registerPatientAction(values);
      if (!res.ok) { if (!applyFieldErrors(form.setError, res)) setError(res.error); return; }
      router.push(res.data!.redirect);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={error} />
      <Field label="Full name" hint="As it appears on your ID or hospital records." error={e.fullName?.message} required>
        <Input autoComplete="name" {...form.register("fullName")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Date of birth" error={e.dateOfBirth?.message} required>
          <Input type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} {...form.register("dateOfBirth")} />
        </Field>
        <Field label="Sex" hint="Used for clinical reference ranges." error={e.sex?.message} required>
          <Select defaultValue="" {...form.register("sex")}>
            <option value="" disabled>Choose…</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="intersex">Intersex</option>
            <option value="undisclosed">Prefer not to say</option>
          </Select>
        </Field>
      </div>
      <Field label="Email address" error={e.email?.message} required>
        <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
      </Field>
      <Field label="Phone number" hint="We'll use this for security codes. Nigerian numbers can start with 0." error={e.phone?.message} required>
        <Input type="tel" autoComplete="tel" inputMode="tel" placeholder="0803 123 4567" {...form.register("phone")} />
      </Field>
      <Field label="Create a password" hint="At least 10 characters, with a number or symbol." error={e.password?.message} required>
        <PasswordInput autoComplete="new-password" {...form.register("password")} />
      </Field>
      <Field label="Confirm password" error={e.confirmPassword?.message} required>
        <PasswordInput autoComplete="new-password" {...form.register("confirmPassword")} />
      </Field>
      <div>
        <div className="flex items-start gap-3">
          <Controller
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <Checkbox id="acceptTerms" checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true)}
                aria-invalid={!!e.acceptTerms} aria-describedby={e.acceptTerms ? "acceptTerms-error" : undefined} className="mt-0.5" />
            )}
          />
          <label htmlFor="acceptTerms" className="text-sm leading-6 text-ink-2">
            I've read the <Link href="/privacy" className="link" target="_blank">privacy notice</Link> and understand how my information is used.
          </label>
        </div>
        {e.acceptTerms && <p id="acceptTerms-error" className="mt-1.5 text-[13px] font-medium text-danger-600">{e.acceptTerms.message}</p>}
      </div>
      <Button type="submit" size="lg" block loading={pending}>Create account</Button>
    </form>
  );
}
