"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { FormError } from "@/components/ui/form-error";
import { forgotPasswordAction } from "../actions";

export default function ForgotPasswordPage() {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.input<typeof forgotPasswordSchema>>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });
  const onSubmit = form.handleSubmit((v) => start(async () => {
    setError(null);
    const res = await forgotPasswordAction(v);
    if (res.ok) setSent(true); else setError(res.error);
  }));
  return (
    <div className="animate-slide-up">
      <h1 className="font-display text-[2rem] font-medium leading-tight text-ink">Reset your password</h1>
      <p className="mt-2 text-[15px] text-ink-3">Enter the email you registered with and we'll send you a secure link.</p>
      <div className="mt-8 space-y-5">
        {sent ? (
          <Callout tone="success" role="status" title="Check your email">
            If an account exists for that address, a reset link is on its way. It expires in 30 minutes.
            <br />Lost access to your email and phone? <Link href="/help/account-recovery" className="underline">Get help recovering your account</Link>.
          </Callout>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <FormError message={error} />
            <Field label="Email address" error={form.formState.errors.email?.message} required>
              <Input type="email" autoComplete="email" {...form.register("email")} />
            </Field>
            <Button type="submit" size="lg" block loading={pending}>Send reset link</Button>
          </form>
        )}
      </div>
      <p className="mt-8 border-t border-line pt-6 text-sm text-ink-3"><Link href="/sign-in" className="link">Back to sign in</Link></p>
    </div>
  );
}
