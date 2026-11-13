import type { Metadata } from "next";
import { requirePlatformRole } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { TabsNav } from "@/components/ui/tabs-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { CATEGORY, DENIAL_REASON, INCIDENT_STATUS, SEVERITY } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { AdminAction } from "../confirm";
import { reviewEmergencyAction, updateIncidentAction } from "../actions";

export const metadata: Metadata = { title: "Security & incidents" };
const TABS = ["incidents", "emergency", "denied", "exports"] as const;

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const actor = await requirePlatformRole(["security_officer"]);
  const sp = await searchParams;
  const tab = TABS.find((t) => t === sp.tab) ?? "incidents";
  const data = await withActor(actor.userId, async (tx) => {
    if (tab === "incidents") return tx`select i.*, h.name as institution from security_incidents i left join healthcare_institutions h on h.id = i.related_institution_id
      order by (i.status in ('open','investigating')) desc, i.created_at desc limit 100`;
    if (tab === "emergency") return tx`select p.id, p.reference, p.justification, p.granted_at, p.expires_at, p.status, p.review_status, p.review_note, h.name as institution,
      hp.full_name as professional, array(select category_key from permission_scopes s where s.permission_id = p.id) as categories
      from permissions p join healthcare_institutions h on h.id = p.institution_id left join healthcare_professionals hp on hp.id = p.professional_id
      where p.authorization_basis = 'emergency_access' order by (p.review_status = 'pending_review') desc, p.granted_at desc limit 100`;
    if (tab === "denied") return tx`select e.id, e.occurred_at, e.action, e.denial_reason, e.category_key, h.name as institution, hp.full_name as professional, e.ip_address::text as ip
      from access_events e left join healthcare_institutions h on h.id = e.institution_id left join healthcare_professionals hp on hp.id = e.actor_professional_id
      where e.outcome = 'denied' order by e.occurred_at desc limit 200`;
    return tx`select x.id, x.occurred_at, x.export_type, x.destination, cardinality(x.record_ids) as n, h.name as institution
      from export_events x left join healthcare_institutions h on h.id = x.institution_id order by x.occurred_at desc limit 200`;
  });
  return (
    <div className="animate-fade-in">
      <PageHeader title="Security monitoring" description="Incidents, emergency-access reviews, denied attempts and export activity. Metadata only." />
      <TabsNav label="Security sections" current={tab} tabs={[{ key: "incidents", label: "Incidents", href: "/admin/security" }, { key: "emergency", label: "Emergency access reviews", href: "/admin/security?tab=emergency" },
        { key: "denied", label: "Denied attempts", href: "/admin/security?tab=denied" }, { key: "exports", label: "Exports & downloads", href: "/admin/security?tab=exports" }]} />
      <Card className="mt-5">
        {data.length === 0 ? <EmptyState icon="health_and_safety" title="Nothing to show" /> : tab === "incidents" ? (
          <ul className="divide-y divide-line">{data.map((i) => (
            <li key={i.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:px-6">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-ink-3">{i.reference}</span><span className="font-semibold text-ink">{i.title}</span>
                  <Badge tone={SEVERITY[i.severity]}>{i.severity}</Badge><Badge tone={INCIDENT_STATUS[i.status]?.tone}>{INCIDENT_STATUS[i.status]?.label}</Badge></div>
                <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{i.description}</p>
                <p className="mt-1 text-xs text-ink-3">{i.source.replace("_", " ")} · {formatDateTime(i.created_at)}{i.institution ? ` · ${i.institution}` : ""}</p>
                {i.resolution_note && <p className="mt-2 rounded-md bg-sunken px-3 py-2 text-xs text-ink-2">Resolution: {i.resolution_note}</p>}
              </div>
              {["open", "investigating", "contained"].includes(i.status) && <div className="flex shrink-0 flex-wrap items-start gap-2">
                {i.status === "open" && <AdminAction label="Investigate" variant="secondary" title="Start investigating" reasonRequired={false} reasonLabel="Notes" action={updateIncidentAction.bind(null, i.id, "investigating")} />}
                <AdminAction label="Resolve" title="Resolve incident" reasonLabel="Resolution and actions taken" action={updateIncidentAction.bind(null, i.id, "resolved")} />
                <AdminAction label="Dismiss" variant="ghost" title="Dismiss incident" reasonLabel="Why this isn't a concern" action={updateIncidentAction.bind(null, i.id, "dismissed")} />
              </div>}
            </li>
          ))}</ul>
        ) : tab === "emergency" ? (
          <ul className="divide-y divide-line">{data.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:px-6">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-ink-3">{p.reference}</span><span className="font-semibold text-ink">{p.professional} · {p.institution}</span>
                  <Badge tone={p.review_status === "pending_review" ? "warning" : p.review_status === "appropriate" ? "success" : "danger"}>{p.review_status.replace("_", " ")}</Badge></div>
                <p className="mt-1 text-sm text-ink-2">"{p.justification}"</p>
                <p className="mt-1 text-xs text-ink-3">{(p.categories as string[]).map((c) => CATEGORY[c]?.label).join(", ")} · {formatDateTime(p.granted_at)} → {formatDateTime(p.expires_at)} · {p.status}</p>
                {p.review_note && <p className="mt-2 text-xs text-ink-3">Review: {p.review_note}</p>}
              </div>
              {p.review_status === "pending_review" && <div className="flex shrink-0 gap-2">
                <AdminAction label="Inappropriate" variant="danger-outline" tone="danger" title="Mark as inappropriate" description="Access is revoked if still active, the patient is notified, and the institution should be investigated." reasonLabel="Review findings" action={reviewEmergencyAction.bind(null, p.id, "inappropriate")} />
                <AdminAction label="Appropriate" title="Mark as appropriate" reasonLabel="Review findings" action={reviewEmergencyAction.bind(null, p.id, "appropriate")} />
              </div>}
            </li>
          ))}</ul>
        ) : tab === "denied" ? (
          <Table caption="Denied access attempts">
            <THead><tr><Th>When</Th><Th>Who</Th><Th>Action</Th><Th>Reason</Th><Th>IP</Th></tr></THead>
            <TBody>{data.map((e) => (
              <Tr key={e.id}><Td className="whitespace-nowrap text-ink-3">{formatDateTime(e.occurred_at)}</Td><Td><p className="text-ink">{e.professional ?? "Non-professional account"}</p><p className="text-xs text-ink-3">{e.institution}</p></Td>
                <Td className="text-ink-2">{e.action.replace(/_/g, " ")}</Td><Td><Badge tone="danger">{DENIAL_REASON[e.denial_reason] ?? e.denial_reason}</Badge></Td><Td className="font-mono text-xs text-ink-3">{e.ip ?? "—"}</Td></Tr>
            ))}</TBody>
          </Table>
        ) : (
          <Table caption="Export events">
            <THead><tr><Th>When</Th><Th>Type</Th><Th>Destination</Th><Th>Records</Th></tr></THead>
            <TBody>{data.map((x) => (
              <Tr key={x.id}><Td className="text-ink-3">{formatDateTime(x.occurred_at)}</Td><Td className="text-ink-2">{x.export_type.replace(/_/g, " ")}</Td>
                <Td>{x.destination === "institution" ? x.institution : "Patient self-download"}</Td><Td className="tabular">{x.n}</Td></Tr>
            ))}</TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
