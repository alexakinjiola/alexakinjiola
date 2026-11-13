import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProviderContext } from "@/lib/auth/provider-context";
import { withActor } from "@/lib/db";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton } from "@/components/ui/action-button";
import { formatDateTime } from "@/lib/format";
import { CreateIntegration } from "./create";
import { setIntegrationStatusAction } from "./actions";

export const metadata: Metadata = { title: "Integrations" };
const STATUS: Record<string, "warning" | "success" | "neutral" | "danger"> = { pending: "warning", active: "success", paused: "neutral", revoked: "danger" };

export default async function IntegrationsPage() {
  const { actor, current, can } = await requireProviderContext("/provider/integrations");
  if (!current || !can("integrations:manage")) redirect("/provider");
  const rows = await withActor(actor.userId, (tx) => tx`select id, name, system_type, standard, status, api_key_prefix, last_used_at, created_at
    from integration_connections where institution_id = ${current.institutionId} order by created_at desc`);
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Records-system integrations" description="Send records from your existing systems automatically. You keep your systems; the platform receives a copy with full provenance." actions={<CreateIntegration />} />
      <Card>{rows.length === 0 ? <EmptyState icon="share" title="No systems connected">Connect your EMR or laboratory system so new results reach patients' records without re-typing.</EmptyState> : (
        <ul className="divide-y divide-line">{rows.map((c) => (
          <li key={c.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
            <div className="flex-1"><p className="font-semibold text-ink">{c.name} <Badge tone={STATUS[c.status]} className="ml-1">{c.status}</Badge></p>
              <p className="text-sm text-ink-3"><span className="font-mono">{c.api_key_prefix}…</span> · {c.system_type.toUpperCase()} · FHIR R4 · {c.last_used_at ? `last used ${formatDateTime(c.last_used_at)}` : "never used"}</p></div>
            <div className="flex gap-2">
              {c.status === "active" && <ActionButton size="sm" variant="secondary" action={setIntegrationStatusAction.bind(null, c.id, "paused")}>Pause</ActionButton>}
              {c.status !== "revoked" && <ActionButton size="sm" variant="danger-outline" action={setIntegrationStatusAction.bind(null, c.id, "revoked")}>Revoke key</ActionButton>}
            </div>
          </li>
        ))}</ul>
      )}</Card>
      <Card><CardHeader><CardTitle>How to send records</CardTitle></CardHeader><CardBody className="space-y-3 text-sm text-ink-2">
        <p>POST a FHIR R4 <code className="font-mono">Bundle</code> to <code className="font-mono">{env().APP_URL}/api/v1/fhir/Bundle</code> with <code className="font-mono">Authorization: Bearer &lt;key&gt;</code>.</p>
        <p>Include a <code className="font-mono">Patient</code> resource whose identifier is the patient's platform Health ID. Supported resources: Observation, DiagnosticReport, Condition, MedicationRequest, MedicationStatement, AllergyIntolerance, Immunization, Procedure, Encounter, DocumentReference, Composition.</p>
        <p>Re-sending a resource with the same id is ignored, so retries are safe. Only identity-verified patients can be matched, and every record is labelled as received through an approved integration.</p>
      </CardBody></Card>
    </div>
  );
}
