import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProviderContext } from "@/lib/auth/provider-context";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { CATEGORY, DENIAL_REASON } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Activity logs" };
const ACTION: Record<string, string> = { search_patient: "Patient search", view_patient_summary: "Patient summary", view_record_list: "Record list", view_record: "Viewed record",
  download_attachment: "Downloaded file", submit_record: "Submitted record", emergency_access: "Emergency access", export: "Export" };

export default async function ActivityPage() {
  const { actor, current, can } = await requireProviderContext("/provider/activity");
  if (!current || !can("activity:view")) redirect("/provider");
  const rows = await withActor(actor.userId, (tx) => tx`select * from app.institution_activity(${current.institutionId}, 300)`);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Activity logs" description="Every attempt by your staff to find, view, download or submit patient information — for compliance review." />
      <Card>
        {rows.length === 0 ? <EmptyState icon="policy" title="No activity yet" /> : (
          <Table caption="Institution access activity">
            <THead><tr><Th>When</Th><Th>Staff</Th><Th>Action</Th><Th>Patient</Th><Th>Outcome</Th></tr></THead>
            <TBody>{rows.map((r) => (
              <Tr key={r.id}>
                <Td className="whitespace-nowrap text-ink-3">{formatDateTime(r.occurred_at)}</Td>
                <Td className="text-ink">{r.actor_name ?? "—"}</Td>
                <Td><p className="text-ink">{ACTION[r.action]}</p>{r.category_key && <p className="text-xs text-ink-3">{CATEGORY[r.category_key]?.singular}</p>}</Td>
                <Td className="text-ink-2">{r.patient_masked ?? "—"}{r.permission_ref && <p className="font-mono text-xs text-ink-3">{r.permission_ref}</p>}</Td>
                <Td>{r.outcome === "allowed" ? <Badge tone="success" dot>Allowed</Badge> : <><Badge tone="danger">Denied</Badge><p className="mt-1 text-xs text-ink-3">{DENIAL_REASON[r.denial_reason] ?? r.denial_reason}</p></>}</Td>
              </Tr>
            ))}</TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
