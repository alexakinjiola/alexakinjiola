import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformRole } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { DescriptionList } from "@/components/ui/description-list";
import { Icon } from "@/components/ui/icon";
import { INSTITUTION_STATUS, INSTITUTION_TYPE, PRO_STATUS } from "@/lib/labels";
import { formatBytes, formatDate, formatDateTime } from "@/lib/format";
import { AdminAction } from "../../confirm";
import { setInstitutionStatusAction } from "../../actions";
import { setIntegrationStatusAction } from "@/app/provider/integrations/actions";

export const metadata: Metadata = { title: "Institution review" };
const DOC: Record<string, string> = { operating_license: "Operating licence", cac_certificate: "CAC certificate", representative_id: "Representative ID", accreditation: "Accreditation", other: "Other" };

export default async function InstitutionReview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const actor = await requirePlatformRole(["platform_admin"]);
  const d = await withActor(actor.userId, async (tx) => {
    const [i] = await tx`select * from healthcare_institutions where id = ${id}`;
    if (!i) return null;
    return {
      i,
      docs: await tx`select id, document_type, file_name, size_bytes, created_at from institution_documents where institution_id = ${id}`,
      staff: await tx`select hp.full_name, hp.verification_status, r.name as role, a.status from professional_affiliations a join healthcare_professionals hp on hp.id = a.professional_id join roles r on r.id = a.role_id where a.institution_id = ${id}`,
      history: await tx`select action, metadata, occurred_at from audit_logs where (institution_id = ${id} and action like 'admin.institution%') or (entity_id = ${id}::text and action like 'institution.%') order by occurred_at desc limit 20`,
      integrations: await tx`select id, name, system_type, status, api_key_prefix, last_used_at from integration_connections where institution_id = ${id} order by created_at desc`,
      perms: (await tx`select count(*)::int n from permissions where institution_id = ${id} and status = 'active'`)[0].n as number,
    };
  });
  if (!d) notFound();
  const { i } = d;
  const s = i.status as string;
  const act = (status: string) => setInstitutionStatusAction.bind(null, id, status);
  return (
    <div className="animate-fade-in">
      <Link href="/admin/institutions" className="inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"><Icon name="arrow_back" size={18} />Institutions</Link>
      <header className="mt-4 flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow">{INSTITUTION_TYPE[i.institution_type]}</p><h1 className="mt-1 text-2xl font-semibold text-ink">{i.name}</h1>
          <Badge tone={INSTITUTION_STATUS[s]?.tone} className="mt-2">{INSTITUTION_STATUS[s]?.label}</Badge></div>
        <div className="flex flex-wrap gap-2">
          {s === "submitted" && <AdminAction label="Start review" title="Mark as under review" variant="secondary" reasonRequired={false} reasonLabel="Note" action={act("under_review")} />}
          {(s === "submitted" || s === "under_review") && <>
            <AdminAction label="Reject" tone="danger" variant="danger-outline" title="Reject this application" description="The reason is shared with the institution so they can correct and resubmit." action={act("rejected")} />
            <AdminAction label="Approve" title="Approve institution" description="Confirm you've checked the licence and registration against the issuing authority. Approval unlocks provider functions." reasonRequired={false} reasonLabel="Verification notes" action={act("approved")} />
          </>}
          {s === "approved" && <AdminAction label="Suspend" tone="danger" title="Suspend institution" description={`Provider functions stop immediately and ${d.perms} active patient permission(s) are paused. Patients are notified.`} action={act("suspended")} />}
          {s === "suspended" && <AdminAction label="Reinstate" title="Reinstate institution" description="Unexpired permissions paused by the suspension become active again." reasonRequired={false} reasonLabel="Notes" action={act("approved")} />}
        </div>
      </header>
      {i.status_reason && <Callout tone="neutral" className="mb-6" title="Last decision note">{i.status_reason}</Callout>}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>Registration & licensing</CardTitle></CardHeader><CardBody>
            <DescriptionList items={[
              { label: "Registration number", value: <span className="font-mono">{i.registration_number}</span> },
              { label: "Operating licence", value: <span className="font-mono">{i.license_number}</span> },
              { label: "Licensing authority", value: i.license_authority },
              { label: "Licence expiry", value: i.license_expires_on ? formatDate(i.license_expires_on) : null },
              { label: "Address", value: `${i.address_line}, ${i.city}, ${i.state}${i.lga ? ` (${i.lga})` : ""}` },
              { label: "Contact", value: `${i.email} · ${i.phone}` },
              { label: "Authorised representative", value: `${i.representative_name}, ${i.representative_title}` },
              { label: "Representative contact", value: `${i.representative_email} · ${i.representative_phone}` },
              { label: "Submitted", value: formatDateTime(i.submitted_at) },
              { label: "Last reviewed", value: i.reviewed_at ? formatDateTime(i.reviewed_at) : null },
            ]} />
          </CardBody></Card>
          <Card><CardHeader><CardTitle>Staff ({d.staff.length})</CardTitle></CardHeader>
            <ul className="divide-y divide-line">{d.staff.map((p, k) => (
              <li key={k} className="flex items-center gap-3 px-5 py-3 text-sm sm:px-6"><span className="flex-1 text-ink">{p.full_name} <span className="text-ink-3">· {p.role}</span></span>
                <Badge tone={PRO_STATUS[p.verification_status]?.tone}>{PRO_STATUS[p.verification_status]?.label}</Badge><Badge tone="neutral">{p.status}</Badge></li>
            ))}</ul></Card>
        </div>
        <aside className="space-y-6">
          <Card><CardHeader><CardTitle>Evidence</CardTitle></CardHeader>
            {d.docs.length === 0 ? <CardBody><p className="text-sm text-danger-fg">No documents uploaded.</p></CardBody> : (
              <ul className="divide-y divide-line">{d.docs.map((doc) => (
                <li key={doc.id}><a href={`/api/admin/institution-documents/${doc.id}`} target="_blank" rel="noopener" className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-canvas/60 sm:px-6">
                  <Icon name="description" size={20} className="text-ink-3" /><span className="flex-1"><span className="block font-medium text-ink">{DOC[doc.document_type]}</span>
                    <span className="text-xs text-ink-3">{doc.file_name} · {formatBytes(doc.size_bytes)}</span></span><Icon name="open_in_new" size={18} className="text-ink-3" /></a></li>
              ))}</ul>
            )}
            <CardBody className="border-t border-line text-xs leading-5 text-ink-3">Verify licence details directly with the issuing authority. Automated registry checks are a pilot dependency.</CardBody>
          </Card>
          {d.integrations.length > 0 && <Card><CardHeader><CardTitle>Records-system connections</CardTitle></CardHeader>
            <ul className="divide-y divide-line">{d.integrations.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-5 py-3 text-sm sm:px-6"><span className="flex-1"><span className="block font-medium text-ink">{c.name}</span>
                <span className="font-mono text-xs text-ink-3">{c.api_key_prefix}… · {c.status}</span></span>
                {(c.status === "pending" || c.status === "paused") && s === "approved" && <AdminAction label="Activate" reasonRequired={false} reasonLabel="Notes" title={`Activate ${c.name}`}
                  description="Records sent with this key will be added to verified patients' records, labelled as received through an approved integration." action={setIntegrationStatusAction.bind(null, c.id, "active")} />}
              </li>))}</ul></Card>}
          <Card><CardHeader><CardTitle>History</CardTitle></CardHeader><CardBody>
            <ol className="space-y-3 text-sm">{d.history.map((h, k) => (
              <li key={k}><p className="text-ink">{h.action.replace(/[._]/g, " ")}{h.metadata?.to ? ` → ${h.metadata.to}` : ""}</p><p className="text-xs text-ink-3">{formatDateTime(h.occurred_at)}</p></li>
            ))}</ol>
          </CardBody></Card>
        </aside>
      </div>
    </div>
  );
}
