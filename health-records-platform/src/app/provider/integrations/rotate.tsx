"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { FormError } from "@/components/ui/form-error";
import { formatDateTime } from "@/lib/format";
import { rotateIntegrationKeyAction } from "./actions";

export function RotateKey({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [res, setRes] = useState<{ key: string; previousValidUntil: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setRes(null); router.refresh(); } }}>
      <DialogTrigger asChild><Button size="sm" variant="secondary" icon="key">Rotate key</Button></DialogTrigger>
      <DialogContent title={res ? "Copy the new key" : `Rotate the key for ${name}?`}
        description={res ? undefined : "A new key is issued now. The current key keeps working for a short grace period so you can update your system without interruption."}>
        {res ? (
          <div className="space-y-4">
            <Callout tone="warning" title="Shown only once">Update your system now.{res.previousValidUntil ? ` The old key stops working ${formatDateTime(res.previousValidUntil)}.` : ""}</Callout>
            <code className="block break-all rounded-md bg-sunken px-3 py-3 font-mono text-[13px] text-ink">{res.key}</code>
            <div className="flex justify-end"><Button onClick={() => setOpen(false)}>I've stored it</Button></div>
          </div>
        ) : (
          <div className="space-y-4">
            <FormError message={error} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button loading={pending} onClick={() => start(async () => { const r = await rotateIntegrationKeyAction(id); if (r.ok) setRes(r.data!); else setError(r.error); })}>Issue new key</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
