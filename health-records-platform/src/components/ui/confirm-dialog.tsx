"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTrigger } from "./dialog";
import { Button, type ButtonProps } from "./button";
import { Field, Input, Textarea } from "./field";
import { FormError } from "./form-error";
import { toast } from "./toast";
import type { ClientActionResult } from "@/lib/client-action";

/**
 * Confirmation for sensitive actions. Optionally collects a reason and/or a
 * step-up credential (password or authenticator code) that the server checks.
 */
export function ConfirmDialog({
  trigger, title, description, confirmLabel, tone = "primary", onConfirm, reason, reauth, children, successMessage, redirectTo,
}: {
  trigger: React.ReactElement;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  tone?: ButtonProps["variant"];
  onConfirm: (input: { reason: string; credential: string }) => Promise<ClientActionResult>;
  reason?: { label: string; required?: boolean; minLength?: number; placeholder?: string };
  reauth?: boolean;
  children?: React.ReactNode;
  successMessage?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [reasonText, setReason] = React.useState("");
  const [credential, setCredential] = React.useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (reason?.required && reasonText.trim().length < (reason.minLength ?? 1)) {
      setError(`Enter at least ${reason.minLength ?? 1} characters for the reason.`);
      return;
    }
    if (reauth && !credential) {
      setError("Confirm it's you to continue.");
      return;
    }
    start(async () => {
      const res = await onConfirm({ reason: reasonText, credential });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setReason("");
      setCredential("");
      toast.success(res.message ?? successMessage ?? "Done.");
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} description={description}>
        <form onSubmit={submit} className="space-y-5">
          {children}
          {reason && (
            <Field label={reason.label} optional={!reason.required} required={reason.required}>
              <Textarea value={reasonText} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={reason.placeholder} maxLength={1000} />
            </Field>
          )}
          {reauth && (
            <Field label="Confirm it's you" hint="Enter your password, or a code from your authenticator app if you use one.">
              <Input type="password" autoComplete="current-password" value={credential} onChange={(e) => setCredential(e.target.value)} />
            </Field>
          )}
          <FormError message={error} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" variant={tone} loading={pending}>{confirmLabel}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
