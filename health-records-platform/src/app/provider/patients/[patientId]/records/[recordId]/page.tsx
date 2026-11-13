import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProviderContext } from "@/lib/auth/provider-context";
import { withActor } from "@/lib/db";
import { requestMeta } from "@/lib/request";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { DescriptionList } from "@/components/ui/description-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { AccessGuard } from "@/components/domain/access-guard";
import { ProvenanceBadge } from "@/components/domain/provenance";
import { StructuredData } from "@/components/domain/structured-data";
import { CATEGORY, DENIAL_REASON, SOURCE } from "@/lib/labels";
import { formatBytes, formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Record" };
export const dynamic = "force-dynamic";

export default async function ProviderRecord({ params }: { params: Promise<{ patientId: string; recordId: string }> }) {
  const { patientId, recordId } = await params;
  if (![patientId, recordId].every((x) => /^[0-9a-f-]{36}$/.test(x))) notFound();
  const { actor, current, can } = await requireProviderContext();
  if (!current || !can("records:view_authorized")) redirect("/provider");
  const inst = current.institutionId;
  const { res, expiry } = await withActor(actor.userId, async (tx) => {
    const [{ r }] = await tx`select app.provider_get_record(${inst}, ${recordId}) as r`;
    const [{ e }] = await tx`select min(expires_at) as e from permissions where id = any(app.active_permission_ids(${inst}, ${patientId}))`;
    return { res: r, expiry: e };
  }, await requestMeta());
  if (!res.allowed || res.record.patient_id !== patientId) {
    return <Card className="mx-auto max-w-xl"><EmptyState icon="lock" title="This record is outside your authorisation" action={<Button asChild variant="secondary"><Link href={`/provider/patients/${patientId}`}>Back to patient</Link></Button>}>{DENIAL_REASON[res.reason] ?? ""} The attempt was logged.</EmptyState></Card>;
  }
  const r = res.record;
  return (
    <AccessGuard patientId={patientId} institutionId={inst} expiresAt={new Date(expiry).toISOString()}>
      <div className="animate-fade-in">
        <Link href={`/provider/patients/${patientId}`} className="inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"><Icon name="arrow_back" size={18} />Patient records</Link>
        <header className="mt-4 pb-6"><p className="eyebrow">{CATEGORY[r.category_key]?.singular}</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">{r.title}</h1><div className="mt-3"><ProvenanceBadge source={r.source} short={false} /></div></header>
        <div className="max-w-4xl space-y-6">
          {r.source === "patient_upload" && <Callout tone="warning" title="Patient-provided document">{SOURCE.patient_upload.explain.replace("You uploaded", "The patient uploaded").replace("you", "the patient")}</Callout>}
          <Card><CardHeader><CardTitle>Details</CardTitle></CardHeader><CardBody>
            <DescriptionList items={[
              { label: "Clinical date", value: r.clinical_date ? formatDate(r.clinical_date) : "Not known" },
              { label: "Added", value: formatDateTime(r.created_at) },
              { label: "Institution", value: r.institution_name ?? r.originating_facility },
              { label: "Professional", value: r.attending_professional, hidden: !r.attending_professional },
              { label: "Version", value: r.current_version },
            ]} />
            {r.description && <p className="mt-6 whitespace-pre-line border-t border-line pt-5 text-[15px] leading-7 text-ink">{r.description}</p>}
          </CardBody></Card>
          {r.structured_data && <StructuredData data={r.structured_data} />}
          <Card><CardHeader><CardTitle>Documents</CardTitle></CardHeader>
            {r.attachments.length === 0 ? <CardBody><p className="text-sm text-ink-3">No files attached.</p></CardBody> : (
              <ul className="divide-y divide-line">{r.attachments.map((a: { id: string; file_name: string; size_bytes: number; mime_type: string }) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3 sm:px-6"><Icon name={a.mime_type === "application/pdf" ? "picture_as_pdf" : "image"} size={22} className="text-ink-3" />
                  <span className="flex-1 text-sm"><span className="font-medium text-ink">{a.file_name}</span> <span className="text-ink-3">· {formatBytes(a.size_bytes)}</span></span>
                  <Button asChild size="sm" variant="secondary" icon="visibility"><a href={`/api/files/${a.id}?institution=${inst}`} target="_blank" rel="noopener">View</a></Button>
                  <Button asChild size="sm" variant="secondary" icon="download"><a href={`/api/files/${a.id}?institution=${inst}&download=1`}>Download</a></Button></li>
              ))}</ul>
            )}
          </Card>
        </div>
      </div>
    </AccessGuard>
  );
}
