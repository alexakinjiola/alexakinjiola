import Link from "next/link";
import { CategoryIcon } from "./category-icon";
import { ProvenanceBadge, provenanceRule } from "./provenance";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { CATEGORY, RECORD_STATUS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export interface RecordRowData {
  id: string; title: string; category_key: string; clinical_date: string | null; created_at: string; source: string;
  status: string; institution_name: string | null; originating_facility: string | null; attending_professional: string | null;
  duplicate_of?: string | null; attachments?: number;
}

export function RecordRow({ r, href, actions }: { r: RecordRowData; href: string; actions?: React.ReactNode }) {
  const where = r.institution_name ?? r.originating_facility ?? "Facility not recorded";
  return (
    <li className={cn("relative flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-canvas/60 sm:flex-row sm:items-center sm:px-6",
      "before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r", provenanceRule(r.source))}>
      <div className="flex min-w-0 flex-1 gap-4">
        <CategoryIcon category={r.category_key} />
        <div className="min-w-0 flex-1">
          <Link href={href} className="text-[15px] font-semibold text-ink hover:underline hover:decoration-line-strong hover:underline-offset-4">
            <span className="absolute inset-0 sm:hidden" aria-hidden />{r.title}
          </Link>
          <p className="mt-0.5 truncate text-sm text-ink-3">
            {CATEGORY[r.category_key]?.singular ?? r.category_key} · {where}{r.attending_professional ? ` · ${r.attending_professional}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ProvenanceBadge source={r.source} />
            {r.status !== "available" && <Badge tone={RECORD_STATUS[r.status]?.tone}>{RECORD_STATUS[r.status]?.label}</Badge>}
            {r.duplicate_of && <Badge tone="warning" icon="content_copy">Possible duplicate</Badge>}
            {!!r.attachments && <span className="inline-flex items-center gap-1 text-xs text-ink-3"><Icon name="attach_file" size={14} />{r.attachments} file{r.attachments > 1 ? "s" : ""}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 pl-14 sm:pl-0 sm:text-right">
        <dl className="text-sm">
          <dt className="sr-only">Clinical date</dt>
          <dd className="font-medium text-ink tabular">{r.clinical_date ? formatDate(r.clinical_date) : "Date unknown"}</dd>
          <dt className="sr-only">Added</dt>
          <dd className="text-xs text-ink-3">Added {formatDate(r.created_at)}</dd>
        </dl>
        {actions}
      </div>
    </li>
  );
}
