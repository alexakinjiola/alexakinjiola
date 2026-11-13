"use client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { ClientActionResult } from "@/lib/client-action";

/** Admin mutation trigger: always asks for a reason and an authenticator code (step-up). */
export function AdminAction({ label, title, description, tone = "primary", reasonLabel = "Reason (recorded in the audit log)", reasonRequired = true, size = "sm", action, variant }: {
  label: string; title: string; description?: string; tone?: ButtonProps["variant"]; reasonLabel?: string; reasonRequired?: boolean;
  size?: ButtonProps["size"]; variant?: ButtonProps["variant"]; action: (i: { reason: string; credential: string }) => Promise<ClientActionResult>;
}) {
  return (
    <ConfirmDialog trigger={<Button size={size} variant={variant ?? tone}>{label}</Button>} title={title} description={description}
      confirmLabel={label} tone={tone} reauth reason={{ label: reasonLabel, required: reasonRequired, minLength: reasonRequired ? 10 : 0 }} onConfirm={action} />
  );
}
