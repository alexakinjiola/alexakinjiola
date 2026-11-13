"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import type { ClientActionResult } from "@/lib/client-action";

export function OtpForm({ action, submitLabel, next }: {
  action: (input: { code: string }, next?: string) => Promise<ClientActionResult<{ redirect: string }>>; submitLabel: string; next?: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await action({ code }, next);
          if (!res.ok) { setError(res.fieldErrors?.code ?? res.error); return; }
          router.push(res.data?.redirect ?? "/home");
          router.refresh();
        });
      }}
    >
      <Field label="6-digit code" error={error ?? undefined} required>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
          autoFocus
        />
      </Field>
      <FormError message={null} />
      <Button type="submit" size="lg" block loading={pending} disabled={code.length !== 6}>{submitLabel}</Button>
    </form>
  );
}
