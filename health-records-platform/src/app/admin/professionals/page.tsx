import type { Metadata } from "next";
import { requirePlatformRole } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { TabsNav } from "@/components/ui/tabs-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PRO_STATUS, PROFESSION } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { AdminAction } from "../confirm";
import { endAffiliationAction, setProfessionalStatusAction } from "../actions";

export const metadata: Metadata = { title: "Professional verification" };
const TABS = ["pending", "verified", "suspended", "rejected", "all"];

export default async function ProfessionalsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const actor = await requirePlatformRole(["platform_admin"]);
  const sp = await searchParams;
  const tab = TABS.includes(sp.status ?? "") ? sp.status! : "pending";
  const rows = await withActor(actor.userId, (tx) => tx`select * from app.admin_professionals(${tab === "all" ? null : tab})`);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Professional verification" description="Check each licence with the relevant council (MDCN, NMCN, PCN, MLSCN, RRBN, HRORBN) before verifying. Clinical functions require a verified licence." />
      <TabsNav label="Verification status" current={tab} tabs={TABS.map((t) => ({ key: t, label: t === "all" ? "All" : PRO_STATUS[t].label, href: `/admin/professionals?status=${t}` }))} />
      <div className="mt-5 space-y-3">
        {rows.length === 0 ? <Card><EmptyState icon="badge" title="Nothing in this queue" /></Card> : rows.map((p) => (
          <Card key={p.id} as="article"><div className="flex flex-col gap-4 p-5 sm:flex-row sm:p-6">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-ink">{p.full_name}</h2><Badge tone={PRO_STATUS[p.verification_status]?.tone}>{PRO_STATUS[p.verification_status]?.label}</Badge>
                {p.account_status !== "active" && <Badge tone="danger">Account {p.account_status}</Badge>}</div>
              <p className="mt-1 text-sm text-ink-3">{PROFESSION[p.profession]} · {p.email} · joined {formatDate(p.created_at)}</p>
              <p className="mt-2 text-sm text-ink">{p.license_body ? <><span className="font-semibold">{p.license_body}</span> <span className="font-mono">{p.license_number}</span>{p.license_expires_on && <span className="text-ink-3"> · expires {formatDate(p.license_expires_on)}</span>}</> : <span className="text-ink-3">No licence on file</span>}</p>
              <ul className="mt-3 flex flex-wrap gap-2">{(p.affiliations as { id: string; institution: string; role: string; status: string }[]).map((a) => (
                <li key={a.id} className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink-2">{a.institution} · {a.role} · {a.status}
                  {a.status === "active" && <AdminAction label="Revoke" variant="ghost" tone="danger" size="sm" title={`Revoke ${p.full_name}'s affiliation with ${a.institution}`} action={endAffiliationAction.bind(null, a.id)} />}</li>
              ))}</ul>
              {p.status_reason && <p className="mt-2 text-xs text-ink-3">Note: {p.status_reason}</p>}
            </div>
            <div className="flex shrink-0 flex-wrap items-start gap-2">
              {p.verification_status !== "verified" && p.license_number && <AdminAction label="Verify licence" title={`Verify ${p.full_name}`} reasonRequired={false} reasonLabel="How was the licence checked?" action={setProfessionalStatusAction.bind(null, p.id, "verified")} />}
              {p.verification_status === "pending" && <AdminAction label="Reject" variant="danger-outline" tone="danger" title="Reject licence" action={setProfessionalStatusAction.bind(null, p.id, "rejected")} />}
              {p.verification_status === "verified" && <AdminAction label="Suspend" variant="danger-outline" tone="danger" title="Suspend professional" description="All clinical functions stop immediately at every institution." action={setProfessionalStatusAction.bind(null, p.id, "suspended")} />}
            </div>
          </div></Card>
        ))}
      </div>
    </div>
  );
}
