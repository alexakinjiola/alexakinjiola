import type { Metadata } from "next";
import { getActor, requireActor } from "@/lib/auth/actor";
import { tickets } from "@/server/patient";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TICKET_CATEGORY, TICKET_STATUS } from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/format";
import { createTicketAction } from "../actions";
import { TicketForm } from "./ticket-form";

export const metadata: Metadata = { title: "Help & support" };

const PATIENT_CATEGORIES = ["account_access", "identity_verification", "duplicate_account", "profile_correction", "record_correction",
  "suspicious_activity", "data_subject_request", "account_closure", "technical", "other"];

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  await requireActor({ next: "/support" });
  const actor = (await getActor())!;
  const { category } = await searchParams;
  const { rows, events } = await tickets(actor.userId);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Help & support" description="Our team can help with account access, identity checks, corrections and anything that doesn't look right." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Card>
          <CardHeader><CardTitle>Your requests</CardTitle></CardHeader>
          {rows.length === 0 ? <EmptyState compact icon="support_agent" title="No requests yet">When you contact us, you can follow progress here.</EmptyState> : (
            <ul className="divide-y divide-line">
              {rows.map((t) => (
                <li key={t.id} className="px-5 py-4 sm:px-6">
                  <details>
                    <summary className="flex cursor-pointer flex-wrap items-center gap-2">
                      <span className="flex-1 text-sm font-semibold text-ink">{t.subject}</span>
                      <Badge tone={TICKET_STATUS[t.status]?.tone}>{TICKET_STATUS[t.status]?.label}</Badge>
                      <span className="w-full text-xs text-ink-3"><span className="font-mono">{t.reference}</span> · {TICKET_CATEGORY[t.category]} · {formatDate(t.created_at)}</span>
                    </summary>
                    <ol className="mt-3 space-y-2 border-l border-line pl-4">
                      {events.filter((e) => e.ticket_id === t.id).map((e, i) => (
                        <li key={i} className="text-sm"><p className="text-xs text-ink-3">{formatDateTime(e.created_at)} · {e.mine ? "You" : "Support team"}</p>
                          <p className="text-ink-2">{e.note ?? (e.event_type === "created" ? "Request opened" : `Status: ${TICKET_STATUS[e.to_status]?.label ?? e.to_status}`)}</p></li>
                      ))}
                    </ol>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader><CardTitle>Contact support</CardTitle></CardHeader>
          <CardBody><TicketForm defaultCategory={category} categories={PATIENT_CATEGORIES} action={createTicketAction} /></CardBody>
        </Card>
      </div>
    </div>
  );
}
