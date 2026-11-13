import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasRecentReauth, requirePatientContext } from "@/lib/auth/actor";
import { requestDetail } from "@/server/patient";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { Icon } from "@/components/ui/icon";
import { INSTITUTION_STATUS, INSTITUTION_TYPE, PROFESSION, PRO_STATUS, PURPOSE, REQUEST_STATUS, CATEGORY } from "@/lib/labels";
import { daysUntil, formatDate, formatDateTime, plural } from "@/lib/format";
import { DecisionForm } from "./decision";

export const metadata: Metadata = { title: "Review access request" };

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { actor } = await requirePatientContext(`/access/requests/${id}`);
  let data;
  try { data = await requestDetail(actor.userId, id); } catch { notFound(); }
  const r = data.request;
  const open = r.status === "pending" && new Date(r.respond_by) > new Date();
  const inst = INSTITUTION_STATUS[r.institution.status];

  return (
    <div className="animate-fade-in">
      <Link href="/access" className="inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"><Icon name="arrow_back" size={18} />Access & sharing</Link>
      <header className="mt-4 pb-6">
        <p className="eyebrow">Access request · <span className="font-mono normal-case tracking-normal">{r.reference}</span></p>
        <h1 className="mt-2 font-display text-[2rem] font-medium leading-tight text-ink">{r.institution.name} wants to see some of your records</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={REQUEST_STATUS[r.status]?.tone}>{REQUEST_STATUS[r.status]?.label}</Badge>
          <span className="text-sm text-ink-3">Sent {formatDateTime(r.created_at)}{open ? ` · expires in ${plural(Math.max(daysUntil(r.respond_by), 0), "day")}` : ""}</span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Why they're asking</CardTitle></CardHeader>
            <CardBody>
              <p className="text-sm font-semibold text-ink">{PURPOSE[r.purpose]?.label}</p>
              <p className="text-sm text-ink-3">{PURPOSE[r.purpose]?.description}</p>
              <blockquote className="mt-4 border-l-2 border-brand-200 pl-4 text-[15px] leading-7 text-ink-2">"{r.purpose_detail}"</blockquote>
            </CardBody>
          </Card>
          <Card>
            <CardHeader><CardTitle>What they've asked for</CardTitle></CardHeader>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(r.categories as string[]).map((c) => <Badge key={c} tone="brand" icon={CATEGORY[c]?.icon}>{CATEGORY[c]?.label}</Badge>)}
              </div>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-ink-3">Records dated</dt><dd className="mt-0.5 font-medium text-ink">
                  {r.date_from || r.date_to ? `${r.date_from ? formatDate(r.date_from) : "Any time"} – ${r.date_to ? formatDate(r.date_to) : "today"}` : "Any date"}</dd></div>
                <div><dt className="text-xs text-ink-3">For</dt><dd className="mt-0.5 font-medium text-ink">{plural(r.duration_days, "day")} after you approve</dd></div>
              </dl>
              <p className="text-sm text-ink-3">That currently covers <strong className="text-ink">{plural(r.matching_records?.length ?? 0, "record")}</strong> on your account.</p>
            </CardBody>
          </Card>
          {open ? (
            <Card>
              <CardHeader><div><CardTitle>Your decision</CardTitle><p className="text-sm text-ink-3">Nothing is shared until you approve.</p></div></CardHeader>
              <CardBody>
                {r.institution.status !== "approved" ? (
                  <Callout tone="danger" title="This institution isn't currently verified">You can't grant access right now. You can still decline the request.</Callout>
                ) : null}
                <div className={r.institution.status !== "approved" ? "mt-5" : ""}>
                  <DecisionForm request={r} consent={data.consent as unknown as { version: number; title: string; body: string }} needsReauth={!hasRecentReauth(actor)} institutionName={r.institution.name} />
                </div>
              </CardBody>
            </Card>
          ) : (
            <Callout tone="neutral" title="This request is closed">
              {r.status === "expired" || (r.status === "pending" && !open) ? "It expired without a response, so no access was granted." : `It was ${REQUEST_STATUS[r.status]?.label.toLowerCase()}${r.decided_at ? ` on ${formatDate(r.decided_at)}` : ""}.`}
            </Callout>
          )}
        </div>
        <aside className="order-first space-y-6 lg:order-last">
          <Card>
            <CardHeader><CardTitle>Who is asking</CardTitle></CardHeader>
            <CardBody className="space-y-5">
              <div>
                <p className="text-xs text-ink-3">Institution</p>
                <p className="mt-0.5 font-semibold text-ink">{r.institution.name}</p>
                <p className="text-sm text-ink-3">{INSTITUTION_TYPE[r.institution.type]}{r.institution.city ? ` · ${r.institution.city}, ${r.institution.state}` : ""}</p>
                <Badge tone={inst?.tone} icon={r.institution.status === "approved" ? "verified" : "warning"} className="mt-2">{inst?.label} on the platform</Badge>
              </div>
              <div className="border-t border-line pt-5">
                <p className="text-xs text-ink-3">Requesting professional</p>
                <p className="mt-0.5 font-semibold text-ink">{r.professional.name}</p>
                <p className="text-sm text-ink-3">{PROFESSION[r.professional.profession]}{r.professional.role ? ` · ${r.professional.role}` : ""}</p>
                <Badge tone={PRO_STATUS[r.professional.verification]?.tone} className="mt-2">{PRO_STATUS[r.professional.verification]?.label}{r.professional.license_body ? ` (${r.professional.license_body})` : ""}</Badge>
              </div>
              {r.previous_requests > 0 && <p className="border-t border-line pt-4 text-sm text-ink-3">They've sent you {plural(r.previous_requests, "other request")} before.</p>}
            </CardBody>
          </Card>
          <div className="rounded-lg border border-line bg-surface p-5 text-sm leading-6 text-ink-2">
            <p className="font-semibold text-ink">Not sure?</p>
            <p className="mt-1">You can ask your doctor what they need it for, approve only part of it, or decline. Declining won't affect your account.</p>
            <Link href="/support" className="link mt-2 inline-block">Ask our support team</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
