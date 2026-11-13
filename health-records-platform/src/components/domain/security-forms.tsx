"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { changePasswordSchema } from "@/lib/validation/auth";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ActionButton } from "@/components/ui/action-button";
import { toast } from "@/components/ui/toast";
import { applyFieldErrors } from "@/lib/client-action";
import { changePasswordAction, disableMfaAction, revokeSessionAction, sendPhoneCodeAction, verifyPhoneCodeAction } from "@/app/(auth)/actions";

export function ChangePasswordForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.input<typeof changePasswordSchema>>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: "", password: "", confirmPassword: "" } });
  const e = form.formState.errors;
  return (
    <form noValidate className="space-y-5" onSubmit={form.handleSubmit((v) => start(async () => {
      setError(null);
      const res = await changePasswordAction(v);
      if (res.ok) { toast.success(res.message!); form.reset(); }
      else if (!applyFieldErrors(form.setError, res)) setError(res.error);
    }))}>
      <FormError message={error} />
      <Field label="Current password" error={e.currentPassword?.message} required><PasswordInput autoComplete="current-password" {...form.register("currentPassword")} /></Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="New password" error={e.password?.message} required><PasswordInput autoComplete="new-password" {...form.register("password")} /></Field>
        <Field label="Confirm new password" error={e.confirmPassword?.message} required><PasswordInput autoComplete="new-password" {...form.register("confirmPassword")} /></Field>
      </div>
      <div className="flex justify-end"><Button type="submit" loading={pending}>Change password</Button></div>
    </form>
  );
}

export function DisableMfaButton() {
  return (
    <ConfirmDialog
      trigger={<Button variant="danger-outline" size="sm">Turn off</Button>}
      title="Turn off two-step verification?"
      description="Your account will only be protected by your password. We'll send you a security alert."
      confirmLabel="Turn off" tone="danger" reauth
      onConfirm={disableMfaAction}
    />
  );
}

export function RevokeSessionButton({ id }: { id: string }) {
  return <ActionButton variant="ghost" size="sm" action={() => revokeSessionAction(id)}>Sign out</ActionButton>;
}

export function PhoneVerify() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!sent) return <ActionButton variant="secondary" size="sm" refresh={false} action={sendPhoneCodeAction} onDone={() => setSent(true)}>Verify phone</ActionButton>;
  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); setError(null); start(async () => {
      const res = await verifyPhoneCodeAction({ code });
      if (res.ok) { toast.success(res.message!); router.refresh(); } else setError(res.fieldErrors?.code ?? res.error);
    }); }}>
      <Field label="Code from SMS" error={error ?? undefined} className="w-40">
        <Input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
      </Field>
      <Button type="submit" size="md" loading={pending}>Confirm</Button>
    </form>
  );
}
