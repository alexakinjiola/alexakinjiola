"use client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { revokePermissionAction } from "../../../actions";

export function RevokeButton({ permissionId, institution, needsReauth }: { permissionId: string; institution: string; needsReauth: boolean }) {
  return (
    <ConfirmDialog
      trigger={<Button variant="danger" icon="block">Revoke access</Button>}
      title={`Revoke access for ${institution}?`}
      description="Access ends immediately. Any open screens at the institution stop working, and they'll be notified."
      confirmLabel="Revoke access"
      tone="danger"
      reauth={needsReauth}
      reason={{ label: "Reason", placeholder: "Optional — shared with the institution" }}
      onConfirm={(input) => revokePermissionAction(permissionId, input)}
    >
      <Callout tone="warning" title="What revoking can't undo">
        Information the institution already downloaded, printed or copied into its own system can't be recalled remotely. They remain bound by medical confidentiality.
      </Callout>
    </ConfirmDialog>
  );
}
