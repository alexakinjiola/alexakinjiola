import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProviderContext } from "@/lib/auth/provider-context";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { CATEGORY, RECORD_STATUS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { resolveCorrectionAction } from "../actions";

export const metadata: Metadata = { title: "Record submissions" };
const KIND: Record<string, string> = { flag_error: "Reported error", correction_request: "Correction request", dispute: "Dispute" };

export default async function SubmissionsPage() {
  const { actor, current, can } = await requireProviderContext("/provider/submissions");
  if (!current || !(can("records:submit") || can("activity:view"))) redirect("/provider");
  const { rows, corrections } = await withActor(actor.userId, async (tx) => ({
    rows: await tx`select * from app.provider_submissions(${current.institutionId})`,
    corrections: await tx`select c.id, c.kind, c.details, c.status, c.created_at, c.record_id from record_corrections c
      where app.record_institution(c.record_id) = ${current.institutionId} and c.status in ('open','under_review') order by c.created_at`,
  }));
  const titleOf = Object.fromEntries(rows.map((r) => [r.id, r.title]));
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Record submissions" description="Records your institution has added. Original submissions are never overwritten." />
      {corrections.length > 0 && can("records:submit") && (
        <Card className="border-warning-line">
          <CardHeader><CardTitle>Patient queries awaiting a response ({corrections.length})</CardTitle></CardHeader>
          <ul className="divide-y divide-line">{corrections.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:px-6">
              <div className="flex-1"><p className="text-sm font-semibold text-ink">{KIND[c.kind]} · {titleOf[c.record_id] ?? "Record"}</p>
                <p className="mt-1 text-sm text-ink-2">"{c.details}"</p><p className="mt-1 text-xs text-ink-3">{formatDate(c.created_at)}</p></div>
              <div className="flex gap-2 self-start">
                {(["resolved", "rejected"] as const).map((s) => (
                  <ConfirmDialog key={s} trigger={<Button size="sm" variant={s === "resolved" ? "primary" : "secondary"}>{s === "resolved" ? "Resolve" : "Decline"}</Button>}
                    title={s === "resolved" ? "Resolve this query" : "Decline this query"} confirmLabel="Send response"
                    description="Your response is shared with the patient. If the record needs amending, submit a corrected record — the original stays in its history."
                    reason={{ label: "Response to the patient", required: true, minLength: 10 }}
                    onConfirm={resolveCorrectionAction.bind(null, c.id, s)} />
                ))}
              </div>
            </li>
          ))}</ul>
        </Card>
      )}
      <Card>
        {rows.length === 0 ? <EmptyState icon="receipt_long" title="No submissions yet" /> : (
          <Table caption="Submitted records">
            <THead><tr><Th>Record</Th><Th>Patient</Th><Th>Clinical date</Th><Th>Submitted</Th><Th>Status</Th></tr></THead>
            <TBody>{rows.map((r) => (
              <Tr key={r.id}>
                <Td><p className="font-medium text-ink">{r.title}</p><p className="text-xs text-ink-3">{CATEGORY[r.category_key]?.singular} · {r.submitted_by}</p></Td>
                <Td className="text-ink-2">{r.patient_masked}</Td>
                <Td className="text-ink-2">{formatDate(r.clinical_date)}</Td>
                <Td className="text-ink-3">{formatDate(r.created_at)}</Td>
                <Td className="space-x-1"><Badge tone={RECORD_STATUS[r.status]?.tone}>{RECORD_STATUS[r.status]?.label}</Badge>
                  {r.duplicate && <Badge tone="warning">Possible duplicate</Badge>}{Number(r.open_corrections) > 0 && <Badge tone="warning">Query</Badge>}</Td>
              </Tr>
            ))}</TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
