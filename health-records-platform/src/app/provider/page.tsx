import type { Metadata } from "next";
import Link from "next/link";
import { requireProviderContext } from "@/lib/auth/provider-context";
import { providerDashboard } from "@/server/provider";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { SubmissionsChart } from "@/components/domain/charts";
import { CATEGORY, DENIAL_REASON, INSTITUTION_STATUS, PRO_STATUS, PURPOSE } from "@/lib/labels";
import { formatDate, formatDateTime, relativeTime } from "@/lib/format";

export const metadata: Metadata = { title: "Provider overview" };

const ACTION: Record<string, string> = { search_patient: "searched for a patient", view_patient_summary: "opened a patient summary", view_record_list: "viewed a record list",
  view_record: "viewed a record", download_attachment: "downloaded a file", submit_record: "submitted a record", emergency_access: "used emergency access", export: "exported" };

export default async function ProviderHome() {
  const { actor, current, can } = await requireProviderContext();

  if (!current) {
    return (
      <div className="mx-auto max-w-2xl py-6">
        <PageHeader title="Welcome to the provider workspace" description="Register your institution to start, or ask your administrator for an invitation if your institution is already on the platform." />
        <Card><CardBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Icon name="domain" size={32} className="text-brand-600" />
          <div className="flex-1"><p className="font-semibold text-ink">Register a hospital, clinic or laboratory</p>
            <p className="text-sm text-ink-3">You'll need registration and licence details, and a copy of your operating licence.</p></div>
          <Button asChild><Link href="/provider/institution/new">Start registration</Link></Button>
        </CardBody></Card>
      </div>
    );
  }

  if (current.institutionStatus !== "approved") {
    const s = INSTITUTION_STATUS[current.institutionStatus];
    return (
      <div className="mx-auto max-w-3xl animate-fade-in">
        <PageHeader eyebrow="Institution status" title={current.institutionName} />
        <Callout tone={current.institutionStatus === "rejected" || current.institutionStatus === "suspended" ? "danger" : "info"}
          title={`Your institution is ${s.label.toLowerCase()}`}
          action={<Button asChild size="sm" variant="secondary"><Link href="/provider/institution">View application</Link></Button>}>
          {current.institutionStatus === "draft" && "Finish your application and upload your operating licence, then submit it for verification."}
          {(current.institutionStatus === "submitted" || current.institutionStatus === "under_review") && "The platform team is reviewing your documents. Provider functions unlock once you're verified — we'll notify you."}
          {current.institutionStatus === "rejected" && "Your application wasn't approved. Review the reason, update the details and resubmit."}
          {current.institutionStatus === "suspended" && "Provider functions are paused and patient permissions are on hold. Contact the platform team."}
        </Callout>
        <ol className="mt-8 space-y-4">
          {[["Create your account", true], ["Add institution details and licence", current.institutionStatus !== "draft"], ["Platform verification", false],
            ["Invite your staff", false], ["Staff licences verified", false]].map(([label, done], i) => (
            <li key={String(label)} className="flex items-center gap-4">
              <span className={`grid size-8 place-items-center rounded-full text-sm font-semibold ${done ? "bg-success-bg text-success-fg" : "bg-sunken text-ink-3"}`}>{done ? <Icon name="check" size={18} /> : i + 1}</span>
              <span className={done ? "text-ink" : "text-ink-3"}>{label}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const { d, pending, submissions, activity, expiring, notifications } = await providerDashboard(actor.userId, current.institutionId);
  const pro = actor.professional;
  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader eyebrow={current.institutionName} title={`Good to see you, ${pro?.fullName.split(" ").slice(0, 2).join(" ") ?? actor.displayName}`}
        actions={<>
          {can("access:request") && <Button asChild variant="secondary" icon="person_search"><Link href="/provider/search">Find a patient</Link></Button>}
          {can("records:submit") && <Button asChild icon="upload_file"><Link href="/provider/submit">Submit a record</Link></Button>}
        </>} />
      {pro && pro.verificationStatus !== "verified" && current.roleKey !== "institution_admin" && (
        <Callout tone="warning" title={PRO_STATUS[pro.verificationStatus]?.label}>
          Clinical functions unlock once the platform team verifies your licence. You can still view your institution's overview.
        </Callout>
      )}
      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Records submitted" value={d.records_submitted} hint={`${d.records_30d} in the last 30 days`} icon="receipt_long" href="/provider/submissions" />
        <Stat label="Pending requests" value={d.pending} hint="Waiting for patients" icon="pending_actions" href="/provider/requests?status=pending" />
        <Stat label="Approved requests" value={d.approved} hint={`${d.rejected} declined · ${d.expired_requests} expired`} icon="task_alt" href="/provider/requests" />
        <Stat label="Expiring permissions" value={d.expiring_soon} hint={`${d.active_permissions} active in total`} icon="hourglass_top" href="/provider/patients" tone={d.expiring_soon ? "attention" : "neutral"} />
      </section>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Submissions per week</CardTitle><span className="text-sm text-ink-3">Last 8 weeks</span></CardHeader>
            <CardBody><SubmissionsChart data={d.submissions_weekly} /></CardBody>
          </Card>
          <Card>
            <CardHeader><CardTitle>Recent submissions</CardTitle><Link href="/provider/submissions" className="link text-sm">All submissions</Link></CardHeader>
            {submissions.length === 0 ? <EmptyState compact icon="receipt_long" title="No records submitted yet" /> : (
              <ul className="divide-y divide-line">{submissions.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3 text-sm sm:px-6">
                  <Icon name={CATEGORY[s.category_key]?.icon ?? "description"} size={20} className="text-brand-600" />
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium text-ink">{s.title}</span>
                    <span className="text-xs text-ink-3">{s.patient_masked} · {s.submitted_by} · {formatDate(s.created_at)}</span></span>
                  {Number(s.open_corrections) > 0 && <Badge tone="warning">Query open</Badge>}
                </li>
              ))}</ul>
            )}
          </Card>
          {can("activity:view") && (
            <Card>
              <CardHeader><CardTitle>Staff activity</CardTitle><Link href="/provider/activity" className="link text-sm">Activity logs</Link></CardHeader>
              <ul className="divide-y divide-line">{activity.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-5 py-3 text-sm sm:px-6">
                  <Icon name={a.outcome === "denied" ? "block" : "history"} size={18} className={a.outcome === "denied" ? "mt-0.5 text-danger-fg" : "mt-0.5 text-ink-3"} />
                  <span className="flex-1"><span className="text-ink">{a.actor_name ?? "Staff"} {ACTION[a.action]}{a.patient_masked ? ` · ${a.patient_masked}` : ""}</span>
                    {a.outcome === "denied" && <span className="block text-xs text-danger-fg">Blocked: {DENIAL_REASON[a.denial_reason] ?? a.denial_reason}</span>}</span>
                  <span className="text-xs text-ink-3">{relativeTime(a.occurred_at)}</span>
                </li>
              ))}</ul>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Awaiting patients</CardTitle><Link href="/provider/requests" className="link text-sm">All</Link></CardHeader>
            {pending.length === 0 ? <CardBody><p className="text-sm text-ink-3">No pending requests.</p></CardBody> : (
              <ul className="divide-y divide-line">{pending.map((r) => (
                <li key={r.id} className="px-5 py-3 text-sm sm:px-6"><p className="font-medium text-ink">{r.patient_masked} <span className="font-mono text-xs text-ink-3">{r.reference}</span></p>
                  <p className="text-xs text-ink-3">{PURPOSE[r.purpose]?.label} · expires {formatDate(r.respond_by)}</p></li>
              ))}</ul>
            )}
          </Card>
          {expiring.length > 0 && (
            <Card className="border-warning-line">
              <CardHeader><CardTitle>Access ending within 72 hours</CardTitle></CardHeader>
              <ul className="divide-y divide-line">{expiring.map((p) => (
                <li key={p.permission_id}><Link href={`/provider/patients/${p.patient_id}`} className="block px-5 py-3 text-sm hover:bg-canvas/60 sm:px-6">
                  <span className="font-medium text-ink">{p.full_name}</span><span className="block text-xs text-warning-fg">Ends {formatDateTime(p.expires_at)}</span></Link></li>
              ))}</ul>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>Notifications</CardTitle><Link href="/provider/notifications" className="link text-sm">All</Link></CardHeader>
            <CardBody className="space-y-3">{notifications.length === 0 ? <p className="text-sm text-ink-3">Nothing new.</p> : notifications.map((n) => (
              <div key={n.id} className="text-sm"><p className={n.read_at ? "text-ink-2" : "font-semibold text-ink"}>{n.title}</p><p className="text-xs text-ink-3">{relativeTime(n.created_at)}</p></div>
            ))}</CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
