"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { signInSchema } from "@/lib/validation/auth";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { applyFieldErrors } from "@/lib/client-action";
import { signInAction } from "../actions";

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.input<typeof signInSchema>>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" } });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    start(async () => {
      const res = await signInAction(values, next);
      if (!res.ok) {
        if (!applyFieldErrors(form.setError, res)) setError(res.error);
        return;
      }
      router.push(res.data!.redirect);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={error} />
      <Field label="Email address" error={errors.email?.message} required>
        <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
      </Field>
      <Field label="Password" error={errors.password?.message} required>
        <PasswordInput autoComplete="current-password" {...form.register("password")} />
      </Field>
      <div className="flex justify-end -mt-2">
        <Link href="/forgot-password" className="link text-sm">Forgotten your password?</Link>
      </div>
      <Button type="submit" size="lg" block loading={pending}>Sign in</Button>
    </form>
  );
}
