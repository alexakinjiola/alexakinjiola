import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProviderContext } from "@/lib/auth/provider-context";
import { institutionDetail } from "@/server/provider";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { Icon } from "@/components/ui/icon";
import { ActionButton } from "@/components/ui/action-button";
import { INSTITUTION_STATUS } from "@/lib/labels";
import { formatBytes, formatDate, formatDateTime } from "@/lib/format";
import { InstitutionForm } from "./institution-form";
import { DocumentUpload } from "./documents";
import { submitInstitutionAction } from "../actions";

export const metadata: Metadata = { title: "Institution" };

const DOC: Record<string, string> = { operating_license: "Operating licence", cac_certificate: "CAC certificate", representative_id: "Representative ID", accreditation: "Accreditation", other: "Other" };

export default async function InstitutionPage() {
  const { actor, current } = await requireProviderContext("/provider/institution");
  const instId = current?.institutionId ?? actor.ownedInstitutionDrafts[0]?.id;
  if (!instId) redirect("/provider/institution/new");
  const { i, docs } = await institutionDetail(actor.userId, instId);
  if (!i) redirect("/provider");
  const editable = ["draft", "rejected"].includes(i.status) && i.created_by === actor.userId;
  const s = INSTITUTION_STATUS[i.status];
  const values = Object.fromEntries(["name","institution_type","registration_number","license_number","license_authority","address_line","city","state","lga","email","phone","website","representative_name","representative_title","representative_email","representative_phone"].map((k) => [k, i[k] ?? ""]));
  values.license_expires_on = i.license_expires_on ? new Date(i.license_expires_on).toISOString().slice(0, 10) : "";
  const hasLicence = docs.some((d) => d.document_type === "operating_license");

  return (
    <div className="animate-fade-in">
      <PageHeader eyebrow="Institution settings" title={i.name} actions={<Badge tone={s.tone}>{s.label}</Badge>} />
      {i.status_reason && <Callout tone={i.status === "approved" ? "info" : "danger"} className="mb-6" title="Message from the platform team">{i.status_reason}</Callout>}
      {editable && (
        <Callout tone="info" className="mb-6" title={hasLicence ? "Ready to submit?" : "Upload your operating licence to continue"}
          action={<ActionButton disabled={!hasLicence} icon="send" action={() => submitInstitutionAction(i.id)}>Submit for verification</ActionButton>}>
          Once submitted, details are locked while the platform team reviews them. You'll be notified of the outcome.
        </Callout>
      )}
      {(i.status === "submitted" || i.status === "under_review") && <Callout tone="info" className="mb-6">Submitted {formatDateTime(i.submitted_at)}. The review usually takes a few working days.</Callout>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card><CardHeader><CardTitle>Registration details</CardTitle>{!editable && <Badge tone="neutral" icon="lock">Locked</Badge>}</CardHeader>
          <CardBody><InstitutionForm initial={values as never} institutionId={i.id} disabled={!editable} /></CardBody></Card>
        <aside className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Supporting documents</CardTitle></CardHeader>
            {docs.length > 0 && (
              <ul className="divide-y divide-line">{docs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-5 py-3 text-sm sm:px-6"><Icon name="description" size={20} className="text-ink-3" />
                  <span className="min-w-0 flex-1"><span className="block font-medium text-ink">{DOC[d.document_type]}</span>
                    <span className="block truncate text-xs text-ink-3">{d.file_name} · {formatBytes(d.size_bytes)} · {formatDate(d.created_at)}</span></span></li>
              ))}</ul>
            )}
            <CardBody className={docs.length ? "border-t border-line" : ""}>
              {["draft", "rejected", "approved"].includes(i.status) ? <DocumentUpload institutionId={i.id} /> : <p className="text-sm text-ink-3">Documents are locked during review.</p>}
            </CardBody>
          </Card>
          <p className="text-sm text-ink-3">Questions about verification? <Link href="/provider/account#support" className="link">Contact the platform team</Link>.</p>
        </aside>
      </div>
    </div>
  );
}
