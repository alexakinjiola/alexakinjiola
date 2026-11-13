import type { Metadata } from "next";
import Link from "next/link";
import { requirePatientContext } from "@/lib/auth/actor";
import { timeline } from "@/server/patient";
import { PageHeader } from "@/components/ui/page-header";
import { Callout } from "@/components/ui/callout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterField, filterControl } from "@/components/ui/filter-bar";
import { CategoryIcon } from "@/components/domain/category-icon";
import { ProvenanceBadge } from "@/components/domain/provenance";
import { Icon } from "@/components/ui/icon";
import { CATEGORY, CATEGORY_KEYS } from "@/lib/labels";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Health timeline" };

export default async function TimelinePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { actor, patientId } = await requirePatientContext("/timeline");
  const f = {
    category: CATEGORY_KEYS.includes(sp.category ?? "") ? sp.category : undefined,
    institution: /^[0-9a-f-]{36}$/.test(sp.institution ?? "") ? sp.institution : undefined,
    from: /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") ? sp.from : undefined,
    to: /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? "") ? sp.to : undefined,
  };
  const { rows, institutions } = await timeline(actor.userId, patientId, f);
  const byYear = new Map<string, typeof rows>();
  for (const r of rows) {
    const y = String(new Date(r.event_date).getFullYear());
    byYear.set(y, [...(byYear.get(y) ?? []), r] as typeof rows);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Health timeline" description="Your care in date order — visits, diagnoses, tests, medicines, procedures, admissions and vaccinations." />
      <Callout tone="info" className="mb-5" title="This shows what's on the platform, not necessarily your full history">
        Care from hospitals that aren't connected, or documents you haven't uploaded, won't appear here.
        Records without a known date are placed on the day they were added.
      </Callout>
      <FilterBar resetHref="/timeline" label="Filter timeline">
        <FilterField label="Category">
          <select name="category" defaultValue={f.category ?? ""} className={filterControl}>
            <option value="">All categories</option>
            {CATEGORY_KEYS.filter((k) => k !== "other").map((k) => <option key={k} value={k}>{CATEGORY[k].label}</option>)}
          </select>
        </FilterField>
        <FilterField label="Institution">
          <select name="institution" defaultValue={f.institution ?? ""} className={filterControl}>
            <option value="">All institutions</option>
            {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </FilterField>
        <FilterField label="From"><input type="date" name="from" defaultValue={f.from} className={filterControl} /></FilterField>
        <FilterField label="To"><input type="date" name="to" defaultValue={f.to} className={filterControl} /></FilterField>
      </FilterBar>

      {rows.length === 0 ? (
        <Card className="mt-6">
          <EmptyState icon="timeline" title="Nothing to show yet" action={<Button asChild variant="secondary" icon="upload_file"><Link href="/records/upload">Upload a record</Link></Button>}>
            {Object.values(f).some(Boolean) ? "No events match these filters." : "As records are added, they'll appear here in the order they happened."}
          </EmptyState>
        </Card>
      ) : (
        <div className="mt-8 space-y-10">
          {[...byYear.entries()].map(([year, items]) => (
            <section key={year} aria-labelledby={`y-${year}`}>
              <h2 id={`y-${year}`} className="sticky top-16 z-10 -mx-1 mb-4 bg-canvas/95 px-1 py-1 font-display text-2xl font-medium text-ink backdrop-blur">{year}</h2>
              <ol className="relative space-y-3 border-l-2 border-line pl-6 sm:ml-[92px] sm:pl-8">
                {items.map((r) => (
                  <li key={r.id} className="relative">
                    <span className="absolute -left-[33px] top-5 size-3 rounded-full border-2 border-canvas bg-brand-600 ring-2 ring-brand-100 sm:-left-[41px]" aria-hidden />
                    <time dateTime={String(r.event_date)} className="mb-1 block text-xs font-medium text-ink-3 sm:absolute sm:-left-[132px] sm:top-4 sm:mb-0 sm:w-20 sm:text-right">
                      {formatDate(r.event_date, { day: "numeric", month: "short" })}
                    </time>
                    <Link href={`/records/${r.id}`} className="group flex gap-4 rounded-lg border border-line bg-surface p-4 shadow-xs transition-colors hover:border-line-strong">
                      <CategoryIcon category={r.category_key} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-ink-3">{CATEGORY[r.category_key]?.singular}</p>
                        <p className="font-semibold text-ink group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-4">{r.title}</p>
                        <p className="mt-0.5 text-sm text-ink-3">{r.institution_name ?? r.originating_facility ?? "Facility not recorded"}{r.attending_professional ? ` · ${r.attending_professional}` : ""}</p>
                        {r.description && <p className="mt-2 line-clamp-2 text-sm text-ink-2">{r.description}</p>}
                        <div className="mt-2.5 flex items-center gap-2">
                          <ProvenanceBadge source={r.source} />
                          {!r.clinical_date && <span className="text-xs text-ink-3">Date not known</span>}
                        </div>
                      </div>
                      <Icon name="chevron_right" size={20} className="self-center text-ink-3" />
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
