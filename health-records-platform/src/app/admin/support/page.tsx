import type { Metadata } from "next";
import { requirePlatformRole } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { TabsNav } from "@/components/ui/tabs-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { TICKET_CATEGORY, TICKET_STATUS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { internalTicketNoteAction, updateTicketAction } from "../actions";

export const metadata: Metadata = { title: "Support" };
const PRIORITY: Record<string, "neutral" | "info" | "warning" | "danger"> = { low: "neutral", normal: "info", high: "warning", urgent: "danger" };

export default async function SupportAdmin({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const actor = await requirePlatformRole(["support_agent", "platform_admin"]);
  const sp = await searchParams;
  const tab = sp.tab === "closed" ? "closed" : sp.tab === "institution" ? "institution" : "open";
  const { tickets, events, names } = await withActor(actor.userId, async (tx) => {
    const t = await tx`select t.*, h.name as institution from support_tickets t left join healthcare_institutions h on h.id = t.institution_id
      where (${tab} = 'closed' and t.status in ('resolved','closed')) or (${tab} = 'open' and t.status not in ('resolved','closed') and t.requester_type = 'patient')
         or (${tab} = 'institution' and t.status not in ('resolved','closed') and t.requester_type <> 'patient')
      order by case t.priority when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end, t.created_at limit 100`;
    const ev = t.length ? await tx`select * from support_ticket_events where ticket_id = any(${t.map((x) => x.id)}::uuid[]) order by created_at` : [];
    const ids = [...new Set(t.map((x) => x.requester_user_id))];
    const u = ids.length ? await tx`select * from app.admin_users_brief(${ids}::uuid[])` : [];
    return { tickets: t, events: ev, names: Object.fromEntries(u.map((x) => [x.id, `${x.display_name} · ${x.email}`])) };
  });
  return (
    <div className="animate-fade-in">
      <PageHeader title="Support" description="Patient and institution requests: categorise, track and resolve. Ask for the minimum personal information needed." />
      <TabsNav label="Ticket queues" current={tab} tabs={[{ key: "open", label: "Patients", href: "/admin/support" }, { key: "institution", label: "Institutions & staff", href: "/admin/support?tab=institution" }, { key: "closed", label: "Resolved", href: "/admin/support?tab=closed" }]} />
      <div className="mt-5 space-y-3">
        {tickets.length === 0 ? <Card><EmptyState icon="support_agent" title="Queue is clear" /></Card> : tickets.map((t) => (
          <Card key={t.id} as="article"><div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-ink-3">{t.reference}</span><h2 className="font-semibold text-ink">{t.subject}</h2>
              <Badge tone={TICKET_STATUS[t.status]?.tone}>{TICKET_STATUS[t.status]?.label}</Badge><Badge tone={PRIORITY[t.priority]}>{t.priority}</Badge><Badge tone="neutral">{TICKET_CATEGORY[t.category]}</Badge></div>
            <p className="mt-1 text-xs text-ink-3">{names[t.requester_user_id]} · {t.requester_type}{t.institution ? ` · ${t.institution}` : ""} · {formatDateTime(t.created_at)}</p>
            <p className="mt-3 whitespace-pre-line text-sm text-ink-2">{t.description}</p>
            <ol className="mt-3 space-y-1.5 border-l border-line pl-4">{events.filter((e) => e.ticket_id === t.id && e.event_type !== "created").map((e) => (
              <li key={e.id} className="text-xs text-ink-3">{formatDateTime(e.created_at)} · {e.to_status ? `→ ${TICKET_STATUS[e.to_status]?.label}` : "comment"}{e.note ? `: ${e.note}` : ""}{!e.visible_to_requester && " (internal)"}</li>
            ))}</ol>
            {!["resolved", "closed"].includes(t.status) && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                {(["in_progress", "awaiting_requester", "resolved"] as const).map((s) => (
                  <ConfirmDialog key={s} trigger={<Button size="sm" variant={s === "resolved" ? "primary" : "secondary"}>{TICKET_STATUS[s].label}</Button>}
                    title={`Mark as ${TICKET_STATUS[s].label.toLowerCase()}`} confirmLabel="Update" description="Your note is shared with the requester."
                    reason={{ label: "Message to requester", required: s !== "in_progress", minLength: 5 }} onConfirm={updateTicketAction.bind(null, t.id, s)} />
                ))}
                <ConfirmDialog trigger={<Button size="sm" variant="ghost">Internal note</Button>} title="Add internal note" confirmLabel="Save note" description="Not visible to the requester."
                  reason={{ label: "Note", required: true, minLength: 3 }} onConfirm={internalTicketNoteAction.bind(null, t.id, t.status)} />
              </div>
            )}
          </div></Card>
        ))}
      </div>
    </div>
  );
}
