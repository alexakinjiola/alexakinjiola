import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProviderContext } from "@/lib/auth/provider-context";
import { withActor } from "@/lib/db";
import { requestMeta } from "@/lib/request";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { AccessGuard } from "@/components/domain/access-guard";
import { RecordRow, type RecordRowData } from "@/components/domain/record-row";
import { BASIS, CATEGORY, DENIAL_REASON, PURPOSE } from "@/lib/labels";
import { age, formatDate, formatDateTime } from "@/lib/format";
import { formatHealthId } from "@/lib/validation/common";

export const metadata: Metadata = { title: "Patient records" };
export const dynamic = "force-dynamic";

type Perm = { id: string; reference: string; purpose: string; purpose_detail: string; basis: string; expires_at: string; date_from: string | null; date_to: string | null; categories: string[]; restricted_to_professional: boolean; specific_records: number };

export default async function ProviderPatient({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(patientId)) notFound();
  const { actor, current, can } = await requireProviderContext(`/provider/patients/${patientId}`);
  if (!current || !can("records:view_authorized")) redirect("/provider");
  const inst = current.institutionId;
  const meta = await requestMeta();
  const { overview, records } = await withActor(actor.userId, async (tx) => {
    const [{ o }] = await tx`select app.provider_patient_overview(${inst}, ${patientId}) as o`;
    const recs = o.allowed ? await tx`select * from app.provider_list_records(${inst}, ${patientId})` : [];
    return { overview: o, records: recs };
  }, meta);

  if (!overview.allowed) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <Card><EmptyState icon="lock" title="You don't have access to this patient's records"
          action={<div className="flex gap-2"><Button asChild variant="secondary"><Link href="/provider/patients">Back</Link></Button><Button asChild><Link href={`/provider/requests/new?patient=${patientId}`}>Request access</Link></Button></div>}>
          {DENIAL_REASON[overview.reason] ?? "No valid authorisation."} This attempt has been recorded.
        </EmptyState></Card>
      </div>
    );
  }
  const p = overview.patient;
  const perms = overview.permissions as Perm[];
  const earliest = perms.map((x) => x.expires_at).sort()[0];
  const byCat = new Map<string, RecordRowData[]>();
  for (const r of records as unknown as RecordRowData[]) byCat.set(r.category_key, [...(byCat.get(r.category_key) ?? []), r]);

  return (
    <AccessGuard patientId={patientId} institutionId={inst} expiresAt={earliest}>
      <div className="animate-fade-in space-y-6">
        <header className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-5 shadow-xs sm:flex-row sm:items-center sm:p-6">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-navy-800 text-lg font-semibold text-white">{p.full_name.split(" ").map((s: string) => s[0]).slice(0, 2).join("")}</span>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-[-0.015em] text-ink">{p.full_name}</h1>
            <p className="mt-1 text-sm text-ink-3">{age(p.date_of_birth)} years · born {formatDate(p.date_of_birth)} · {p.sex} · <span className="font-mono">{formatHealthId(p.health_id)}</span></p>
          </div>
          <div className="flex flex-wrap gap-2">
            {can("records:submit") && <Button asChild variant="secondary" icon="upload_file"><Link href={`/provider/submit?patient=${patientId}`}>Add a record</Link></Button>}
          </div>
        </header>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Callout tone="info" icon="policy">Only records inside the patient's approved scope are shown. Records labelled "Uploaded by patient" have not been verified by an institution.</Callout>
            {records.length === 0 ? <Card><EmptyState icon="folder_open" title="No records within the approved scope" /></Card> : (
              [...byCat.entries()].map(([cat, recs]) => (
                <Card key={cat}>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Icon name={CATEGORY[cat]?.icon ?? "description"} size={20} className="text-brand-600" />{CATEGORY[cat]?.label}</CardTitle><span className="text-sm text-ink-3">{recs.length}</span></CardHeader>
                  <ul className="divide-y divide-line">{recs.map((r) => <RecordRow key={r.id} r={r} href={`/provider/patients/${patientId}/records/${r.id}`} />)}</ul>
                </Card>
              ))
            )}
          </div>
          <aside className="space-y-4">
            {perms.map((x) => (
              <Card key={x.id}>
                <CardHeader><div><CardTitle>Authorisation</CardTitle><p className="font-mono text-xs text-ink-3">{x.reference}</p></div>
                  {x.basis === "emergency_access" ? <Badge tone="danger" icon="emergency">Emergency</Badge> : <Badge tone="success">Active</Badge>}</CardHeader>
                <CardBody className="space-y-3 text-sm">
                  <p><span className="text-ink-3">Purpose:</span> <span className="text-ink">{PURPOSE[x.purpose]?.label}</span></p>
                  <p><span className="text-ink-3">Basis:</span> <span className="text-ink">{BASIS[x.basis]?.replace("Your", "Patient")}</span></p>
                  <p><span className="text-ink-3">Categories:</span> <span className="text-ink">{x.categories.map((c) => CATEGORY[c]?.label).join(", ")}</span></p>
                  {x.specific_records > 0 && <p className="text-ink-3">Limited to {x.specific_records} selected record(s).</p>}
                  {(x.date_from || x.date_to) && <p><span className="text-ink-3">Dated:</span> {x.date_from ? formatDate(x.date_from) : "any"} – {x.date_to ? formatDate(x.date_to) : "today"}</p>}
                  {x.restricted_to_professional && <p className="text-ink-3">Granted to the requesting professional only.</p>}
                  <p className="border-t border-line pt-3 font-medium text-ink">Ends {formatDateTime(x.expires_at)}</p>
                </CardBody>
              </Card>
            ))}
            <p className="px-1 text-xs leading-5 text-ink-3">Every view and download is logged and shown to the patient. Downloaded copies are your institution's responsibility under medical confidentiality.</p>
          </aside>
        </div>
      </div>
    </AccessGuard>
  );
}
