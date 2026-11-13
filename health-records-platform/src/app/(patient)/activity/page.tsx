import type { Metadata } from "next";
import { requirePatientContext } from "@/lib/auth/actor";
import { activity, ACTIVITY_PAGE_SIZE } from "@/server/patient";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { FilterBar, FilterField, filterControl } from "@/components/ui/filter-bar";
import { ActivityItem, type ActivityRow } from "@/components/domain/activity-item";
import { ReportButton } from "./report";

export const metadata: Metadata = { title: "Activity history" };

const KINDS = [
  ["viewed", "Records viewed"], ["downloaded", "Files downloaded"], ["exported", "Your downloads"], ["submitted", "Records added"],
  ["request", "Access requests"], ["permission", "Permissions"], ["blocked", "Blocked attempts"], ["emergency", "Emergency access"],
  ["lookup", "Health ID lookups"], ["record", "Your record changes"],
] as const;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { actor, patientId } = await requirePatientContext("/activity");
  const f = {
    from: /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") ? sp.from : undefined,
    to: /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? "") ? sp.to : undefined,
    institution: /^[0-9a-f-]{36}$/.test(sp.institution ?? "") ? sp.institution : undefined,
    kind: KINDS.some(([k]) => k === sp.kind) ? sp.kind : undefined,
    page: Number(sp.page) || 1,
  };
  const d = await activity(actor.userId, patientId, f);
  const qs = (page: number) => `/activity?${new URLSearchParams({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v && typeof v === "string")) as Record<string, string>, page: String(page) })}`;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Activity history"
        description="Every request, view, download and permission change involving your records — including attempts we blocked."
        actions={<ReportButton />}
      />
      <FilterBar resetHref="/activity" label="Filter activity">
        <FilterField label="Type">
          <select name="kind" defaultValue={f.kind ?? ""} className={filterControl}>
            <option value="">All activity</option>
            {KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </FilterField>
        <FilterField label="Institution">
          <select name="institution" defaultValue={f.institution ?? ""} className={filterControl}>
            <option value="">All institutions</option>
            {d.institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </FilterField>
        <FilterField label="From"><input type="date" name="from" defaultValue={f.from} className={filterControl} /></FilterField>
        <FilterField label="To"><input type="date" name="to" defaultValue={f.to} className={filterControl} /></FilterField>
      </FilterBar>
      <Card className="mt-5">
        {d.rows.length === 0 ? (
          <EmptyState icon="history" title="No activity found">
            {Object.values(f).some((v) => v && v !== 1) ? "Nothing matches these filters." : "Activity appears here as soon as anyone asks for, views or adds to your records."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {(d.rows as unknown as ActivityRow[]).map((a) => (
              <ActivityItem key={a.event_key} a={a} action={a.access_event_id && a.kind !== "lookup" ? <ReportButton eventId={a.access_event_id} compact /> : undefined} />
            ))}
          </ul>
        )}
      </Card>
      <Pagination page={d.page} pageSize={ACTIVITY_PAGE_SIZE} total={d.total} hrefFor={qs} />
      <p className="mt-6 text-xs leading-5 text-ink-3">
        Staff names are shown for views and downloads made under your permissions. If any detail is missing or looks incomplete, report it so our security team can review the underlying audit log.
      </p>
    </div>
  );
}
