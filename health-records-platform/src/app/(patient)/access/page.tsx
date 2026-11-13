import type { Metadata } from "next";
import Link from "next/link";
import { requirePatientContext } from "@/lib/auth/actor";
import { accessOverview, type AccessTab } from "@/server/patient";
import { PageHeader } from "@/components/ui/page-header";
import { TabsNav } from "@/components/ui/tabs-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { CATEGORY, INSTITUTION_STATUS, PERMISSION_STATUS, PURPOSE, REQUEST_STATUS, BASIS } from "@/lib/labels";
import { daysUntil, formatDate, plural, relativeTime } from "@/lib/format";

export const metadata: Metadata = { title: "Access & sharing" };

const TABS: AccessTab[] = ["pending", "active", "expired", "revoked"];

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab = (TABS.find((t) => t === sp.tab) ?? "pending") as AccessTab;
  const { actor, patientId } = await requirePatientContext("/access");
  const d = await accessOverview(actor.userId, patientId, tab);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Access & sharing" description="See who has asked for your records, who can see them now, and end access whenever you choose." />
      <TabsNav label="Access sections" current={tab} tabs={[
        { key: "pending", label: "Pending requests", href: "/access?tab=pending", count: d.counts.pending },
        { key: "active", label: "Active permissions", href: "/access?tab=active", count: d.counts.active },
        { key: "expired", label: "Expired", href: "/access?tab=expired", count: d.counts.expired },
        { key: "revoked", label: "Revoked", href: "/access?tab=revoked", count: d.counts.revoked },
      ]} />

      <div className="mt-6 space-y-6">
        {tab === "pending" && (
          <>
            {d.requests.length === 0 ? (
              <Card><EmptyState icon="task_alt" title="No requests waiting">When a hospital or clinic asks to see your records, the request appears here and we'll notify you.</EmptyState></Card>
            ) : (
              <ul className="space-y-4">
                {d.requests.map((r) => (
                  <li key={r.id}>
                    <Card as="article" className="overflow-hidden">
                      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-[17px] font-semibold text-ink">{r.institution_name}</h2>
                            <Badge tone={INSTITUTION_STATUS[r.institution_status]?.tone} icon={r.institution_status === "approved" ? "verified" : "warning"}>{INSTITUTION_STATUS[r.institution_status]?.label}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-ink-3">{r.professional_name} · {PURPOSE[r.purpose]?.label} · <span className="font-mono">{r.reference}</span></p>
                          <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink-2">"{r.purpose_detail}"</p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {(r.categories as string[]).map((c) => <Badge key={c} tone="neutral">{CATEGORY[c]?.label}</Badge>)}
                          </div>
                        </div>
                        <dl className="grid shrink-0 grid-cols-3 gap-4 text-sm sm:w-56 sm:grid-cols-1 sm:gap-2 sm:text-right">
                          <div><dt className="text-xs text-ink-3">Asked</dt><dd className="font-medium text-ink">{relativeTime(r.created_at)}</dd></div>
                          <div><dt className="text-xs text-ink-3">Duration</dt><dd className="font-medium text-ink">{plural(r.requested_duration_days, "day")}</dd></div>
                          <div><dt className="text-xs text-ink-3">Request expires</dt><dd className="font-medium text-warning-fg">{formatDate(r.respond_by)}</dd></div>
                        </dl>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-canvas/50 px-5 py-3 sm:px-6">
                        <Button asChild variant="secondary" size="sm"><Link href={`/access/requests/${r.id}`}>View details</Link></Button>
                        <Button asChild size="sm"><Link href={`/access/requests/${r.id}`}>Review and decide</Link></Button>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
            {d.history.length > 0 && (
              <Card>
                <div className="border-b border-line px-5 py-3.5 sm:px-6"><h2 className="text-sm font-semibold text-ink">Earlier requests</h2></div>
                <ul className="divide-y divide-line">
                  {d.history.map((h) => (
                    <li key={h.id}>
                      <Link href={`/access/requests/${h.id}`} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-canvas/60 sm:px-6">
                        <span className="flex-1 font-medium text-ink">{h.institution_name}</span>
                        <span className="hidden font-mono text-xs text-ink-3 sm:inline">{h.reference}</span>
                        <Badge tone={REQUEST_STATUS[h.status === "pending" ? "expired" : h.status]?.tone}>{REQUEST_STATUS[h.status === "pending" ? "expired" : h.status]?.label}</Badge>
                        <span className="w-24 text-right text-xs text-ink-3">{formatDate(h.decided_at ?? h.created_at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}

        {tab !== "pending" && (
          d.permissions.length === 0 ? (
            <Card><EmptyState icon="shield_person" title={tab === "active" ? "Nobody can see your records right now" : `No ${tab} permissions`}>
              {tab === "active" ? "When you approve a request, the permission appears here until it expires or you revoke it." : "Permissions move here when they end."}
            </EmptyState></Card>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {d.permissions.map((p) => {
                const s = p.status === "active" && new Date(p.expires_at) <= new Date() ? "expired" : p.status;
                const left = daysUntil(p.expires_at);
                return (
                  <li key={p.id}>
                    <Link href={`/access/permissions/${p.id}`} className="block h-full rounded-lg border border-line bg-surface p-5 shadow-xs transition-colors hover:border-line-strong">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">{p.institution_name}</p>
                          <p className="text-sm text-ink-3">{PURPOSE[p.purpose]?.label}{p.restricted && p.professional_name ? ` · only ${p.professional_name}` : " · clinical team"}</p>
                        </div>
                        <Badge tone={PERMISSION_STATUS[s]?.tone}>{PERMISSION_STATUS[s]?.label}</Badge>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {(p.categories as string[]).map((c) => <Badge key={c} tone="neutral">{CATEGORY[c]?.label}</Badge>)}
                        {p.specific_records > 0 && <Badge tone="info">{plural(p.specific_records, "selected record")}</Badge>}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line pt-3 text-xs text-ink-3">
                        <span>{BASIS[p.authorization_basis]}</span>
                        {s === "active" && <span className={left <= 3 ? "font-medium text-warning-fg" : ""}><Icon name="schedule" size={14} className="mr-1 inline align-[-2px]" />Ends {formatDate(p.expires_at)}</span>}
                        {s === "revoked" && <span>Revoked {formatDate(p.revoked_at)}</span>}
                        {s === "expired" && <span>Ended {formatDate(p.expires_at)}</span>}
                        {s === "suspended" && <span>Paused — institution suspended</span>}
                        <span>{plural(p.uses, "access", "accesses")}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )
        )}
      </div>
    </div>
  );
}
