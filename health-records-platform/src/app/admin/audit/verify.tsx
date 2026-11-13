"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { verifyAuditChainAction } from "../actions";

export function VerifyChain() {
  const [r, setR] = useState<{ valid: boolean; checked: number; brokenAt: number | null } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <Button variant="secondary" icon="fact_check" loading={pending} onClick={() => start(async () => { const res = await verifyAuditChainAction(); if (res.ok) setR(res.data!); else setErr(res.error); })}>Verify audit chain integrity</Button>
      {err && <Callout tone="danger">{err}</Callout>}
      {r && (r.valid ? <Callout tone="success" role="status" title="Audit chain intact">{r.checked.toLocaleString()} entries verified. No alteration detected.</Callout>
        : <Callout tone="danger" role="alert" title="Tampering detected">The chain breaks at entry #{r.brokenAt}. Treat as a security incident and preserve the database for forensic review.</Callout>)}
    </div>
  );
}
