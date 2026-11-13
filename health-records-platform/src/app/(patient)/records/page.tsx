import type { Metadata } from "next";
import Link from "next/link";
import { requirePatientContext } from "@/lib/auth/actor";
import { listRecords, RECORDS_PAGE_SIZE, type RecordFilters } from "@/server/patient";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { FilterBar, FilterField, filterControl } from "@/components/ui/filter-bar";
import { RecordRow, type RecordRowData } from "@/components/domain/record-row";
import { Icon } from "@/components/ui/icon";
import { CATEGORY, CATEGORY_KEYS } from "@/lib/labels";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "My health records" };

type SP = Record<string, string | undefined>;
const clean = (v?: string) => (v && v.trim() ? v.trim() : undefined);

export default async function RecordsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { actor, patientId } = await requirePatientContext("/records");
  const f: RecordFilters = {
    q: clean(sp.q), category: CATEGORY_KEYS.includes(sp.category ?? "") ? sp.category : undefined,
    institution: /^[0-9a-f-]{36}$/.test(sp.institution ?? "") ? sp.institution : undefined,
    source: ["patient_upload", "institution_submission", "integration"].includes(sp.source ?? "") ? sp.source : undefined,
    from: /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") ? sp.from : undefined, to: /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? "") ? sp.to : undefined,
    sort: (["clinical_desc", "clinical_asc", "uploaded_desc", "title"] as const).find((s) => s === sp.sort), page: Number(sp.page) || 1,
  };
  const data = await listRecords(actor.userId, patientId, f);
  const counts = Object.fromEntries(data.byCategory.map((c) => [c.category_key, c.n]));
  const qs = (patch: SP) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/records?${p.toString()}`;
  };
  const filtered = Object.entries(f).some(([k, v]) => k !== "page" && k !== "sort" && v);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="My health records"
        description="Everything on your record, with where it came from. Uploads you added yourself are labelled so no one mistakes them for verified clinical records."
        actions={<><Button asChild variant="secondary" icon="download"><Link href="/records/export">Export</Link></Button><Button asChild icon="upload_file"><Link href="/records/upload">Upload a record</Link></Button></>}
      />
      <nav aria-label="Record categories" className="-mx-1 mb-5 overflow-x-auto pb-1">
        <ul className="flex min-w-max gap-2 px-1">
          <li><Link href={qs({ category: undefined, page: undefined })} aria-current={!f.category ? "page" : undefined}
            className={cn("inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium", !f.category ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-surface text-ink-2 hover:border-line-strong")}>All</Link></li>
          {CATEGORY_KEYS.map((k) => (
            <li key={k}>
              <Link href={qs({ category: k, page: undefined })} aria-current={f.category === k ? "page" : undefined}
                className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium",
                  f.category === k ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-surface text-ink-2 hover:border-line-strong")}>
                <Icon name={CATEGORY[k].icon} size={16} />{CATEGORY[k].label}
                <span className="tabular opacity-70">{counts[k] ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <FilterBar resetHref="/records" label="Filter records">
        {f.category && <input type="hidden" name="category" value={f.category} />}
        <FilterField label="Search" className="lg:col-span-2"><input name="q" defaultValue={f.q} placeholder="Title or facility" className={filterControl} /></FilterField>
        <FilterField label="Institution">
          <select name="institution" defaultValue={f.institution ?? ""} className={filterControl}>
            <option value="">All institutions</option>
            {data.institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </FilterField>
        <FilterField label="Source">
          <select name="source" defaultValue={f.source ?? ""} className={filterControl}>
            <option value="">Any source</option><option value="institution_submission">Verified institution</option>
            <option value="integration">Approved integration</option><option value="patient_upload">Uploaded by me</option>
          </select>
        </FilterField>
        <FilterField label="From"><input type="date" name="from" defaultValue={f.from} className={filterControl} /></FilterField>
        <FilterField label="To"><input type="date" name="to" defaultValue={f.to} className={filterControl} /></FilterField>
        <FilterField label="Sort by">
          <select name="sort" defaultValue={f.sort ?? "clinical_desc"} className={filterControl}>
            <option value="clinical_desc">Newest clinical date</option><option value="clinical_asc">Oldest clinical date</option>
            <option value="uploaded_desc">Recently added</option><option value="title">Title A–Z</option>
          </select>
        </FilterField>
      </FilterBar>

      <Card className="mt-5">
        {data.rows.length === 0 ? (
          filtered ? (
            <EmptyState icon="content_paste_search" title="No records match these filters" action={<Button asChild variant="secondary"><Link href="/records">Clear filters</Link></Button>}>
              Try a wider date range or a different category.
            </EmptyState>
          ) : (
            <EmptyState icon="folder_open" title="Your record is empty for now" action={<Button asChild icon="upload_file"><Link href="/records/upload">Upload a document</Link></Button>}>
              When a verified hospital or lab adds a record, it appears here automatically. You can also upload results and letters you already have.
            </EmptyState>
          )
        ) : (
          <ul className="divide-y divide-line">
            {(data.rows as unknown as (RecordRowData & { first_attachment: string | null })[]).map((r) => (
              <RecordRow key={r.id} r={r} href={`/records/${r.id}`} actions={
                r.first_attachment ? (
                  <a href={`/api/files/${r.first_attachment}?download=1`} className="relative z-10 grid size-9 place-items-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink">
                    <Icon name="download" size={20} label={`Download ${r.title}`} />
                  </a>
                ) : null
              } />
            ))}
          </ul>
        )}
      </Card>
      <Pagination page={data.page} pageSize={RECORDS_PAGE_SIZE} total={data.total} hrefFor={(p) => qs({ page: String(p) })} />
    </div>
  );
}
