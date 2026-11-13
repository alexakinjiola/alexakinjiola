import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePatientContext } from "@/lib/auth/actor";
import { getRecord } from "@/server/patient";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { DescriptionList } from "@/components/ui/description-list";
import { Icon } from "@/components/ui/icon";
import { CategoryIcon } from "@/components/domain/category-icon";
import { ProvenanceBadge } from "@/components/domain/provenance";
import { StructuredData } from "@/components/domain/structured-data";
import { CATEGORY, RECORD_STATUS, SOURCE, INSTITUTION_STATUS } from "@/lib/labels";
import { formatBytes, formatDate, formatDateTime } from "@/lib/format";
import { CorrectionDialog } from "./correction";
import { MarkInError } from "./remove";

export const metadata: Metadata = { title: "Record" };

const CORRECTION_LABEL: Record<string, string> = { flag_error: "Reported error", correction_request: "Correction request", dispute: "Dispute" };

export default async function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { actor } = await requirePatientContext(`/records/${id}`);
  const data = await getRecord(actor.userId, id);
  if (!data) notFound();
  const { record: r, attachments, versions, corrections, views } = data;
  const src = SOURCE[r.source];

  return (
    <div className="animate-fade-in">
      <Link href="/records" className="inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"><Icon name="arrow_back" size={18} />All records</Link>
      <header className="mt-4 flex flex-col gap-5 pb-6 sm:flex-row sm:items-start">
        <CategoryIcon category={r.category_key} className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{CATEGORY[r.category_key]?.singular}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.015em] text-ink">{r.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <ProvenanceBadge source={r.source} short={false} />
            {r.status !== "available" && <Badge tone={RECORD_STATUS[r.status]?.tone}>{RECORD_STATUS[r.status]?.label}</Badge>}
            {r.duplicate_of && <Link href={`/records/${r.duplicate_of}`}><Badge tone="warning" icon="content_copy">Possible duplicate — view original</Badge></Link>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <CorrectionDialog recordId={r.id} institutional={r.source !== "patient_upload"} />
          {r.source === "patient_upload" && r.status !== "entered_in_error" && <MarkInError recordId={r.id} />}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Callout tone={r.source === "patient_upload" ? "warning" : "success"} icon={src.icon} title={src.label}>{src.explain}</Callout>
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardBody>
              <DescriptionList items={[
                { label: "Clinical date", value: r.clinical_date ? formatDate(r.clinical_date) : "Not known" },
                { label: "Added to your record", value: formatDateTime(r.created_at) },
                { label: r.source === "patient_upload" ? "Facility (as you entered it)" : "Healthcare institution",
                  value: r.institution_name ? <>{r.institution_name} <Badge tone={INSTITUTION_STATUS[r.institution_status]?.tone} className="ml-1">{INSTITUTION_STATUS[r.institution_status]?.label}</Badge></> : r.originating_facility },
                { label: "Attending professional", value: r.attending_professional, hidden: r.source === "patient_upload" },
                { label: "Source", value: src.short },
                { label: "Version", value: `Version ${r.current_version}` },
              ]} />
              {r.description && (
                <div className="mt-6 border-t border-line pt-5">
                  <p className="text-xs font-medium text-ink-3">Notes</p>
                  <p className="mt-1.5 whitespace-pre-line text-[15px] leading-7 text-ink">{r.description}</p>
                </div>
              )}
            </CardBody>
          </Card>
          {r.structured_data && <StructuredData data={r.structured_data} />}
          <Card>
            <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
            {attachments.length === 0 ? <CardBody><p className="text-sm text-ink-3">No files are attached to this record.</p></CardBody> : (
              <ul className="divide-y divide-line">
                {attachments.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6">
                    <span className="grid size-10 place-items-center rounded-md bg-sunken text-ink-2"><Icon name={a.mime_type === "application/pdf" ? "picture_as_pdf" : "image"} size={22} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{a.file_name}</span>
                      <span className="text-xs text-ink-3">{formatBytes(a.size_bytes)} · {a.scan_status === "clean" ? "Checked for security" : "Not available"}</span>
                    </span>
                    {a.scan_status === "clean" && (
                      <span className="flex gap-2">
                        <Button asChild variant="secondary" size="sm" icon="visibility"><a href={`/api/files/${a.id}`} target="_blank" rel="noopener">View</a></Button>
                        <Button asChild variant="secondary" size="sm" icon="download"><a href={`/api/files/${a.id}?download=1`}>Download</a></Button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {corrections.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Your queries about this record</CardTitle></CardHeader>
              <ul className="divide-y divide-line">
                {corrections.map((c) => (
                  <li key={c.id} className="px-5 py-4 sm:px-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{CORRECTION_LABEL[c.kind]}</span>
                      <Badge tone={c.status === "resolved" ? "success" : c.status === "rejected" ? "neutral" : "warning"}>{c.status.replace("_", " ")}</Badge>
                      <span className="text-xs text-ink-3">{formatDate(c.created_at)}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-ink-2">{c.details}</p>
                    {c.resolution_note && <p className="mt-2 rounded-md bg-sunken px-3 py-2 text-sm text-ink-2"><strong>Institution response:</strong> {c.resolution_note}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
        <aside className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Who has seen this</CardTitle></CardHeader>
            <CardBody>
              {views.length === 0 ? <p className="text-sm text-ink-3">No institution has viewed or downloaded this record through the platform.</p> : (
                <ul className="space-y-3">
                  {views.map((v, i) => (
                    <li key={i} className="text-sm">
                      <p className="font-medium text-ink">{v.actor_name ?? "Staff member"}</p>
                      <p className="text-xs text-ink-3">{v.institution_name} · {v.action === "download_attachment" ? "downloaded" : "viewed"} {formatDateTime(v.occurred_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/activity" className="link mt-4 inline-block text-sm">Full activity history</Link>
            </CardBody>
          </Card>
          <Card>
            <CardHeader><CardTitle>Change history</CardTitle></CardHeader>
            <CardBody>
              <ol className="space-y-3 border-l border-line pl-4">
                {versions.map((v) => (
                  <li key={v.version} className="relative text-sm">
                    <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-surface bg-brand-600" aria-hidden />
                    <p className="font-medium text-ink">Version {v.version} · {v.change_type.replace("_", " ")}</p>
                    <p className="text-xs text-ink-3">{formatDateTime(v.created_at)}{v.change_reason ? ` · ${v.change_reason}` : ""}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs leading-5 text-ink-3">Records are never overwritten. Every change creates a new version.</p>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
