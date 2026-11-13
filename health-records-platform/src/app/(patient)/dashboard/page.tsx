import type { Metadata } from "next";
import Link from "next/link";
import { requirePatientContext } from "@/lib/auth/actor";
import { dashboardData } from "@/server/patient";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon, type IconName } from "@/components/ui/icon";
import { HealthIdChip } from "@/components/domain/health-id";
import { CategoryIcon } from "@/components/domain/category-icon";
import { ProvenanceBadge } from "@/components/domain/provenance";
import { ActivityItem, type ActivityRow } from "@/components/domain/activity-item";
import { VERIFICATION, purposeLabel, CATEGORY } from "@/lib/labels";
import { formatDate, relativeTime, daysUntil, plural } from "@/lib/format";

export const metadata: Metadata = { title: "Overview" };

const QUICK: { href: string; label: string; icon: IconName }[] = [
  { href: "/records", label: "View medical records", icon: "folder_open" },
  { href: "/records/upload", label: "Upload a record", icon: "upload_file" },
  { href: "/timeline", label: "View health timeline", icon: "timeline" },
  { href: "/access", label: "Manage access", icon: "shield_person" },
  { href: "/activity", label: "View activity history", icon: "history" },
];

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const { actor, patientId, actingAs } = await requirePatientContext("/dashboard");
  const d = await dashboardData(actor.userId, patientId);
  const v = VERIFICATION[d.profile.verification_status];
  const firstName = d.profile.full_name.split(" ")[0];

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="mt-2 font-display text-[2.25rem] font-medium leading-[1.15] text-ink sm:text-[2.6rem]">
            {actingAs ? `${firstName}'s health record` : `${greeting()}, ${firstName}`}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone={v.tone} icon={v.icon}>{v.label}</Badge>
            {!d.profile.emergency_contact_name && <Badge tone="neutral" icon="info">No emergency contact yet</Badge>}
          </div>
        </div>
        {d.profile.health_id && <HealthIdChip value={d.profile.health_id} />}
      </section>

      {d.profile.verification_status !== "verified" && (
        <Callout tone={d.profile.verification_status === "failed" ? "danger" : "warning"}
          title={d.profile.verification_status === "pending" || d.profile.verification_status === "under_review" ? "We're checking your identity" : "Verify your identity to connect with hospitals"}
          action={d.profile.verification_status === "pending" || d.profile.verification_status === "under_review" ? undefined :
            <Button asChild size="sm" variant="secondary"><Link href="/onboarding/identity">Verify now</Link></Button>}>
          Until your identity is confirmed, healthcare institutions can't find you or add records to your account. You can still upload your own documents.
        </Callout>
      )}

      {d.pending.length > 0 && (
        <Card className="border-warning-line">
          <CardHeader className="border-warning-line bg-warning-bg/60 rounded-t-lg">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-surface text-warning-fg ring-1 ring-warning-line"><Icon name="pending_actions" size={20} /></span>
              <div>
                <CardTitle>{plural(d.pending.length, "institution")} {d.pending.length === 1 ? "is" : "are"} waiting for your decision</CardTitle>
                <p className="text-sm text-ink-3">Nothing is shared until you approve. Unanswered requests expire automatically.</p>
              </div>
            </div>
          </CardHeader>
          <ul className="divide-y divide-line">
            {d.pending.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                <div className="flex-1">
                  <p className="font-semibold text-ink">{r.institution_name}</p>
                  <p className="text-sm text-ink-3">{purposeLabel(r.purpose)} · {plural(r.categories, "category", "categories")} · asked {relativeTime(r.created_at)}</p>
                </div>
                <span className="text-xs font-medium text-warning-fg">Expires in {plural(Math.max(daysUntil(r.respond_by), 0), "day")}</span>
                <Button asChild size="sm"><Link href={`/access/requests/${r.id}`}>Review request</Link></Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Medical records" value={d.counts.records} hint={`${d.counts.uploads} uploaded by you`} icon="folder_open" href="/records" />
        <Stat label="Contributing institutions" value={d.counts.institutions} hint="Hospitals and labs that added records" icon="domain" href="/timeline" />
        <Stat label="Active permissions" value={d.perm.active} icon="shield_person" href="/access?tab=active"
          hint={d.perm.next_expiry ? `Next ends ${formatDate(d.perm.next_expiry)}` : "No one has access right now"} />
        <Stat label="Pending requests" value={d.pending.length} icon="pending_actions" href="/access" tone={d.pending.length ? "attention" : "neutral"}
          hint={d.pending.length ? "Needs your decision" : "You're all caught up"} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recently added records</CardTitle>
              <Link href="/records" className="link text-sm">All records</Link>
            </CardHeader>
            {d.recent.length === 0 ? (
              <EmptyState icon="folder_open" title="No records yet" action={<Button asChild variant="secondary" icon="upload_file"><Link href="/records/upload">Upload a document</Link></Button>}>
                Records appear here when a verified institution adds them, or when you upload documents you already have.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {d.recent.map((r) => (
                  <li key={r.id}>
                    <Link href={`/records/${r.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-canvas/60 sm:px-6">
                      <CategoryIcon category={r.category_key} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{r.title}</span>
                        <span className="block truncate text-xs text-ink-3">{CATEGORY[r.category_key]?.singular} · {r.institution_name ?? "Your upload"} · {formatDate(r.clinical_date)}</span>
                      </span>
                      <span className="hidden sm:block"><ProvenanceBadge source={r.source} /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent activity on your record</CardTitle>
              <Link href="/activity" className="link text-sm">Full history</Link>
            </CardHeader>
            {d.activity.length === 0 ? (
              <EmptyState compact icon="history" title="No activity yet">Every request, view and download involving your records will be listed here.</EmptyState>
            ) : (
              <ul className="divide-y divide-line px-5 sm:px-6">{(d.activity as unknown as ActivityRow[]).map((a) => <ActivityItem key={a.event_key} a={a} compact />)}</ul>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
            <ul className="p-2">
              {QUICK.map((q) => (
                <li key={q.href}>
                  <Link href={q.href} className="flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-ink hover:bg-sunken">
                    <Icon name={q.icon} size={20} className="text-brand-600" />{q.label}<Icon name="chevron_right" size={18} className="ml-auto text-ink-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader><CardTitle>Notifications</CardTitle><Link href="/notifications" className="link text-sm">See all</Link></CardHeader>
            <CardBody className="space-y-4">
              {d.notifications.length === 0 ? <p className="text-sm text-ink-3">Nothing new.</p> : d.notifications.map((n) => (
                <div key={n.id} className="flex gap-3">
                  <span className={`mt-2 size-2 shrink-0 rounded-full ${n.read_at ? "bg-line-strong" : "bg-brand-600"}`} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{n.title}{!n.read_at && <span className="sr-only"> (unread)</span>}</p>
                    <p className="text-xs text-ink-3">{relativeTime(n.created_at)}</p>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
          <Card className="bg-navy-900 text-white border-navy-800">
            <CardBody>
              <Icon name="privacy_tip" size={24} className="text-brand-200" />
              <p className="mt-3 text-sm font-semibold">Your record isn't public</p>
              <p className="mt-1 text-sm leading-6 text-navy-200">
                Hospitals can confirm who you are with your Health ID, but they can't see any record until you approve a request.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
