import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasRecentReauth, requirePatientContext } from "@/lib/auth/actor";
import { permissionDetail } from "@/server/patient";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { DescriptionList } from "@/components/ui/description-list";
import { Icon } from "@/components/ui/icon";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { BASIS, CATEGORY, INSTITUTION_STATUS, PERMISSION_STATUS, PURPOSE, DENIAL_REASON } from "@/lib/labels";
import { daysUntil, formatDate, formatDateTime, plural } from "@/lib/format";
import { RevokeButton } from "./revoke";

export const metadata: Metadata = { title: "Permission" };

const ACTION: Record<string, string> = { view_record: "Viewed record", view_record_list: "Viewed record list", view_patient_summary: "Opened summary", download_attachment: "Downloaded file", emergency_access: "Emergency access" };

export default async function PermissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { actor } = await requirePatientContext(`/access/permissions/${id}`);
  const data = await permissionDetail(actor.userId, id);
  if (!data) notFound();
  const { p, scopes, events } = data;
  const status = p.status === "active" && new Date(p.expires_at) <= new Date() ? "expired" : p.status;
  const consentBased = ["patient_consent", "representative_consent"].includes(p.authorization_basis);
  const cats = [...new Set(scopes.map((s) => s.category_key as string))];

  return (
    <div className="animate-fade-in">
      <Link href={`/access?tab=${status === "suspended" ? "active" : status}`} className="inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"><Icon name="arrow_back" size={18} />Access & sharing</Link>
      <header className="mt-4 flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Permission · <span className="font-mono normal-case tracking-normal">{p.reference}</span></p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.015em] text-ink">{p.institution_name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={PERMISSION_STATUS[status]?.tone}>{PERMISSION_STATUS[status]?.label}</Badge>
            <Badge tone={INSTITUTION_STATUS[p.institution_status]?.tone}>{INSTITUTION_STATUS[p.institution_status]?.label} institution</Badge>
            {p.authorization_basis === "emergency_access" && <Badge tone="danger" icon="emergency">Emergency access</Badge>}
          </div>
        </div>
        {status === "active" && consentBased && <RevokeButton permissionId={p.id} institution={p.institution_name} needsReauth={!hasRecentReauth(actor)} />}
      </header>

      {status === "active" && daysUntil(p.expires_at) <= 3 && <Callout tone="warning" className="mb-6">This access ends {formatDateTime(p.expires_at)}.</Callout>}
      {p.authorization_basis === "emergency_access" && (
        <Callout tone="danger" className="mb-6" title="Opened without your approval, in an emergency">
          A clinician used emergency access with this justification: "{p.justification}". The platform security team reviews every emergency access
          {p.review_status !== "pending_review" ? ` — outcome: ${p.review_status === "appropriate" ? "found appropriate" : "found inappropriate"}.` : " and hasn't finished yet."}
          {" "}If you think it was wrong, <Link href="/activity" className="underline">report it from your activity history</Link>.
        </Callout>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>What they can see</CardTitle></CardHeader>
            <CardBody className="space-y-4">
              <ul className="space-y-3">
                {cats.map((c) => {
                  const recs = scopes.filter((s) => s.category_key === c && s.record_id);
                  return (
                    <li key={c} className="rounded-md border border-line px-4 py-3">
                      <p className="text-sm font-semibold text-ink">{CATEGORY[c]?.label}</p>
                      <p className="text-sm text-ink-3">{recs.length ? `Only: ${recs.map((r) => r.record_title).join(", ")}` : "All records in this category"}</p>
                    </li>
                  );
                })}
              </ul>
              <DescriptionList items={[
                { label: "Records dated", value: p.date_from || p.date_to ? `${p.date_from ? formatDate(p.date_from) : "Any time"} – ${p.date_to ? formatDate(p.date_to) : "today"}` : "Any date" },
                { label: "Who at the institution", value: p.professional_id ? `Only ${p.professional_name}` : "Authorised clinical staff" },
              ]} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader><CardTitle>How they've used it</CardTitle><span className="text-sm text-ink-3">{plural(events.length, "event")}</span></CardHeader>
            {events.length === 0 ? <CardBody><p className="text-sm text-ink-3">They haven't opened any records under this permission yet.</p></CardBody> : (
              <Table caption="Accesses under this permission">
                <THead><tr><Th>When</Th><Th>Who</Th><Th>What</Th><Th>Result</Th></tr></THead>
                <TBody>
                  {events.map((e) => (
                    <Tr key={e.id}>
                      <Td className="whitespace-nowrap text-ink-3">{formatDateTime(e.occurred_at)}</Td>
                      <Td className="text-ink">{e.actor_name ?? "—"}</Td>
                      <Td>{ACTION[e.action] ?? e.action}{e.record_title ? <span className="block text-xs text-ink-3">{e.record_title}</span> : null}</Td>
                      <Td>{e.outcome === "allowed" ? <Badge tone="success" dot>Allowed</Badge> : <Badge tone="danger">Blocked</Badge>}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </div>
        <aside>
          <Card>
            <CardHeader><CardTitle>Permission record</CardTitle></CardHeader>
            <CardBody>
              <DescriptionList columns={1} items={[
                { label: "Purpose", value: <>{PURPOSE[p.purpose]?.label}<span className="mt-1 block text-ink-3">{p.purpose_detail}</span></> },
                { label: "Legal basis", value: BASIS[p.authorization_basis] },
                { label: "Consent terms", value: p.consent_version ? `Version ${p.consent_version}` : null, hidden: !consentBased },
                { label: "Granted", value: `${formatDateTime(p.granted_at)}${p.granted_by_name ? ` by ${p.granted_by_name}` : ""}` },
                { label: status === "active" ? "Ends" : "End date", value: formatDateTime(p.expires_at) },
                { label: "Revoked", value: p.revoked_at ? `${formatDateTime(p.revoked_at)}${p.revocation_reason ? ` — ${DENIAL_REASON[p.revocation_reason] ?? p.revocation_reason}` : ""}` : null, hidden: !p.revoked_at },
                { label: "From request", value: p.request_reference ? <span className="font-mono">{p.request_reference}</span> : null, hidden: !p.request_reference },
              ]} />
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
