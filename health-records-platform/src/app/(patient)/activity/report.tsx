"use client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { reportSuspiciousAction } from "../actions";

export function ReportButton({ eventId, compact }: { eventId?: string | number | null; compact?: boolean }) {
  return (
    <ConfirmDialog
      trigger={compact
        ? <Button variant="ghost" size="icon-sm" icon="report" aria-label="Report this activity" />
        : <Button variant="danger-outline" icon="report">Report suspicious activity</Button>}
      title="Report suspicious activity"
      description="Our security team investigates every report. If something looks like it wasn't you, also change your password."
      confirmLabel="Send report"
      tone="danger"
      successMessage="Report sent. We'll update you through the platform."
      reason={{ label: "What looks wrong?", required: true, minLength: 10, placeholder: "For example: I've never been to this hospital." }}
      onConfirm={({ reason }) => reportSuspiciousAction({ eventId: eventId ? String(eventId) : null, details: reason })}
    />
  );
}
