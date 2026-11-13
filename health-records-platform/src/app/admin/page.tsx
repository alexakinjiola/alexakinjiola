import type { Metadata } from "next";
import Link from "next/link";
import { requirePlatformRole } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { AccessChart } from "@/components/domain/charts";
import { INCIDENT_STATUS, REQUEST_STATUS, SEVERITY } from "@/lib/labels";
import { relativeTime } from "@/lib/format";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminHome() {
  const actor = await requirePlatformRole();
  const { o, incidents } = await withActor(actor.userId, async (tx) => ({
    o: (await tx`select app.admin_overview() as o`)[0].o,
    incidents: actor.platformRoles.includes("security_officer") ? await tx`select id, reference, title, severity, status, created_at from security_incidents where status in ('open','investigating') order by created_at desc limit 5` : [],
  }));
  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader eyebrow="Platform administration" title="Overview" description="Operational oversight. Counts are aggregates; no clinical content is shown in this console." />
      <section aria-label="Platform totals" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Registered patients" value={o.patients} hint={`${o.verified_patients} identity-verified`} icon="group" href="/admin/patients" />
        <Stat label="Verified institutions" value={o.verified_institutions} hint={`${o.institutions} registered`} icon="domain" href="/admin/institutions" />
        <Stat label="Active professionals" value={o.active_professionals} hint={`${o.pending_professionals} awaiting verification`} icon="badge" href="/admin/professionals" tone={o.pending_professionals ? "attention" : "neutral"} />
        <Stat label="Records on platform" value={o.records_submitted + o.records_uploaded} hint={`${o.records_submitted} institutional · ${o.records_uploaded} patient uploads`} icon="folder_open" />
        <Stat label="Pending applications" value={o.pending_institutions} icon="pending_actions" href="/admin/institutions?status=submitted" tone={o.pending_institutions ? "attention" : "neutral"} />
        <Stat label="Open security incidents" value={o.open_incidents} icon="security" href="/admin/security" tone={o.open_incidents ? "attention" : "neutral"} />
        <Stat label="Identity checks waiting" value={o.pending_identity} icon="id_card" href="/admin/patients" />
        <Stat label="Denied attempts (24h)" value={o.denied_24h} icon="block" href="/admin/security" />
      </section>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card><CardHeader><CardTitle>Protected-data access, last 14 days</CardTitle></CardHeader><CardBody><AccessChart data={o.access_daily} /></CardBody></Card>
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>Access requests by outcome</CardTitle></CardHeader>
            <CardBody className="space-y-2">{Object.entries(o.requests_by_status as Record<string, number>).length === 0 ? <p className="text-sm text-ink-3">No requests yet.</p> :
              Object.entries(o.requests_by_status as Record<string, number>).map(([k, n]) => (
                <div key={k} className="flex items-center justify-between text-sm"><Badge tone={REQUEST_STATUS[k]?.tone}>{REQUEST_STATUS[k]?.label ?? k}</Badge><span className="font-semibold tabular text-ink">{n}</span></div>
              ))}</CardBody></Card>
          {incidents.length > 0 && <Card><CardHeader><CardTitle>Open incidents</CardTitle><Link href="/admin/security" className="link text-sm">All</Link></CardHeader>
            <ul className="divide-y divide-line">{incidents.map((i) => (
              <li key={i.id} className="px-5 py-3 text-sm sm:px-6"><p className="font-medium text-ink">{i.title}</p>
                <p className="mt-1 flex items-center gap-2 text-xs text-ink-3"><Badge tone={SEVERITY[i.severity]}>{i.severity}</Badge><Badge tone={INCIDENT_STATUS[i.status]?.tone}>{INCIDENT_STATUS[i.status]?.label}</Badge>{relativeTime(i.created_at)}</p></li>
            ))}</ul></Card>}
        </div>
      </div>
      <Callout tone="neutral" icon="gavel">Platform staff cannot open patient records. Investigations use access metadata and audit logs; if clinical review is ever legally required, it must follow a documented, separately authorised process.</Callout>
    </div>
  );
}
