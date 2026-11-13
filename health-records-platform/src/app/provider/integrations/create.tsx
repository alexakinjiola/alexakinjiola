"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { FormError } from "@/components/ui/form-error";
import { createIntegrationAction } from "./actions";

export function CreateIntegration() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [systemType, setType] = useState("emr");
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setKey(null); setName(""); router.refresh(); } }}>
      <DialogTrigger asChild><Button icon="add">Connect a system</Button></DialogTrigger>
      <DialogContent title={key ? "Copy your integration key" : "Connect a records system"} description={key ? undefined : "Your EMR, hospital management or laboratory system sends records to the platform as FHIR R4 Bundles."}>
        {key ? (
          <div className="space-y-4">
            <Callout tone="warning" title="This is the only time the key is shown">Store it in your system's secret store. We keep only a fingerprint and can't show it again.</Callout>
            <code className="block break-all rounded-md bg-sunken px-3 py-3 font-mono text-[13px] text-ink">{key}</code>
            <div className="flex justify-between gap-2">
              <Button variant="secondary" icon={copied ? "check" : "content_copy"} onClick={async () => { await navigator.clipboard?.writeText(key); setCopied(true); }}>{copied ? "Copied" : "Copy key"}</Button>
              <Button onClick={() => setOpen(false)}>I've stored it</Button>
            </div>
            <p className="text-xs text-ink-3">The connection stays pending until the platform team approves it.</p>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setError(null); start(async () => {
            const res = await createIntegrationAction({ name, systemType });
            if (res.ok) setKey(res.data!.key); else setError(res.fieldErrors?.name ?? res.error);
          }); }}>
            <Field label="System name" hint="For example: OpenMRS — main hospital"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="System type"><Select value={systemType} onChange={(e) => setType(e.target.value)}>
              <option value="emr">Electronic medical record (EMR)</option><option value="hms">Hospital management system</option>
              <option value="lims">Laboratory information system</option><option value="ris_pacs">Radiology / PACS</option><option value="other">Other</option>
            </Select></Field>
            <FormError message={error} />
            <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={pending}>Create connection</Button></div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
