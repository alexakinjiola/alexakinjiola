import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProviderContext } from "@/lib/auth/provider-context";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { TabsNav } from "@/components/ui/tabs-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton } from "@/components/ui/action-button";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { CATEGORY, PURPOSE, REQUEST_STATUS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { cancelRequestAction } from "../actions";

export const metadata: Metadata = { title: "Access requests" };
const TABS = ["all", "pending", "approved", "partially_approved", "rejected", "expired"];

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = TABS.includes(sp.status ?? "") ? sp.status! : "all";
  const { actor, current, can } = await requireProviderContext("/provider/requests");
  if (!current || !can("access:request")) redirect("/provider");
  const rows = await withActor(actor.userId, (tx) => tx`select * from app.provider_requests(${current.institutionId}, ${status === "all" ? null : status})`);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Access requests" description="Requests your institution has sent. Patients decide; an unanswered request never grants access."
        actions={<Button asChild icon="person_search"><Link href="/provider/search">New request</Link></Button>} />
      <TabsNav label="Request status" current={status} tabs={TABS.map((t) => ({ key: t, label: t === "all" ? "All" : REQUEST_STATUS[t].label, href: `/provider/requests${t === "all" ? "" : `?status=${t}`}` }))} />
      <Card className="mt-5">
        {rows.length === 0 ? <EmptyState icon="pending_actions" title="No requests here" action={<Button asChild variant="secondary"><Link href="/provider/search">Find a patient</Link></Button>} /> : (
          <Table caption="Access requests">
            <THead><tr><Th>Patient</Th><Th>Purpose</Th><Th>Categories</Th><Th>Status</Th><Th>Sent</Th><Th><span className="sr-only">Actions</span></Th></tr></THead>
            <TBody>{rows.map((r) => (
              <Tr key={r.id}>
                <Td><p className="font-medium text-ink">{r.patient_masked}</p><p className="font-mono text-xs text-ink-3">{r.reference}</p></Td>
                <Td><p className="text-ink">{PURPOSE[r.purpose]?.label}</p><p className="text-xs text-ink-3">{r.duration_days} days · by {r.requested_by}</p></Td>
                <Td className="max-w-56 text-xs text-ink-2">{(r.categories as string[]).map((c) => CATEGORY[c]?.label).join(", ")}</Td>
                <Td><Badge tone={REQUEST_STATUS[r.status]?.tone}>{REQUEST_STATUS[r.status]?.label}</Badge>
                  {r.status === "pending" && <p className="mt-1 text-xs text-ink-3">Expires {formatDate(r.respond_by)}</p>}</Td>
                <Td className="whitespace-nowrap text-ink-3">{formatDate(r.created_at)}</Td>
                <Td className="text-right">
                  {r.status === "pending" && <ActionButton size="sm" variant="ghost" action={cancelRequestAction.bind(null, r.id)}>Withdraw</ActionButton>}
                  {(r.status === "approved" || r.status === "partially_approved") && r.permission_id && can("records:view_authorized") &&
                    <Button asChild size="sm" variant="secondary"><Link href={`/provider/patients/${r.patient_id}`}>Open</Link></Button>}
                </Td>
              </Tr>
            ))}</TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
