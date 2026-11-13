"use client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { markUploadInErrorAction } from "../../actions";

export function MarkInError({ recordId }: { recordId: string }) {
  return (
    <ConfirmDialog
      trigger={<Button variant="danger-outline" icon="do_not_disturb_on">Mark as uploaded in error</Button>}
      title="Mark this upload as an error?"
      description="It will be hidden from your records and timeline and can no longer be shared. A record of the change is kept for traceability."
      confirmLabel="Mark as error" tone="danger" redirectTo="/records"
      reason={{ label: "Reason", placeholder: "For example: wrong file, or someone else's document" }}
      onConfirm={({ reason }) => markUploadInErrorAction(recordId, { reason })}
    />
  );
}
