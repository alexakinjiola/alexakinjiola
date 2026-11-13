"use client";
import { use, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { applyFieldErrors } from "@/lib/client-action";
import { resetPasswordAction } from "../../actions";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.input<typeof resetPasswordSchema>>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { token, password: "", confirmPassword: "" } });
  const e = form.formState.errors;
  const onSubmit = form.handleSubmit((v) => start(async () => {
    setError(null);
    const res = await resetPasswordAction(v);
    if (res.ok) router.push("/sign-in?reset=1");
    else if (!applyFieldErrors(form.setError, res)) setError(res.error);
  }));
  return (
    <div className="animate-slide-up">
      <h1 className="font-display text-[2rem] font-medium leading-tight text-ink">Choose a new password</h1>
      <p className="mt-2 text-[15px] text-ink-3">For your security, every device signed in to your account will be signed out.</p>
      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <FormError message={error} />
        <Field label="New password" hint="At least 10 characters, with a number or symbol." error={e.password?.message} required>
          <PasswordInput autoComplete="new-password" {...form.register("password")} />
        </Field>
        <Field label="Confirm new password" error={e.confirmPassword?.message} required>
          <PasswordInput autoComplete="new-password" {...form.register("confirmPassword")} />
        </Field>
        <Button type="submit" size="lg" block loading={pending}>Update password</Button>
      </form>
    </div>
  );
}
