import type { Metadata } from "next";
import { requirePatientContext } from "@/lib/auth/actor";
import { profile } from "@/server/patient";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { IdentityForm } from "@/components/domain/identity-form";
import { VERIFICATION } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { SettingsNav } from "../settings-nav";

export const metadata: Metadata = { title: "Identity verification" };

export default async function IdentityPage() {
  const { actor, patientId } = await requirePatientContext("/settings/identity");
  const { p, nin, verifications } = await profile(actor.userId, patientId);
  const v = VERIFICATION[p.verification_status];
  return (
    <div className="animate-fade-in">
      <PageHeader title="Profile & settings" />
      <SettingsNav current="identity" />
      <div className="grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardHeader><div><CardTitle>Identity verification</CardTitle><p className="text-sm text-ink-3">Confirms you are who you say you are, so records are linked to the right person.</p></div>
            <Badge tone={v.tone} icon={v.icon}>{v.label}</Badge></CardHeader>
          <CardBody>
            {p.verification_status === "verified" ? (
              <Callout tone="success" title="You're verified">{nin ? `Verified with NIN ending ${nin.display_hint}.` : "Verified by our team."} {p.verified_at ? `Confirmed ${formatDateTime(p.verified_at)}.` : ""}</Callout>
            ) : p.verification_status === "pending" || p.verification_status === "under_review" ? (
              <Callout tone="warning" title="Verification in progress">We'll notify you as soon as it's complete. If it takes more than 3 working days, contact support.</Callout>
            ) : <IdentityForm done="/dashboard" />}
          </CardBody>
        </Card>
        <aside>
          <Card><CardHeader><CardTitle>History</CardTitle></CardHeader><CardBody>
            {verifications.length === 0 ? <p className="text-sm text-ink-3">No attempts yet.</p> : (
              <ul className="space-y-3 text-sm">{verifications.map((x, i) => (
                <li key={i}><p className="font-medium text-ink">{x.method === "nin" ? "NIN check" : "In-person request"} · <Badge tone={VERIFICATION[x.status]?.tone}>{VERIFICATION[x.status]?.label}</Badge></p>
                  <p className="text-xs text-ink-3">{formatDateTime(x.submitted_at)}{x.failure_reason ? ` · ${x.failure_reason}` : ""}</p></li>
              ))}</ul>
            )}
          </CardBody></Card>
        </aside>
      </div>
    </div>
  );
}
