import Link from "next/link";
import { Icon } from "./icon";
import { cn } from "@/lib/cn";

export function Pagination({ page, pageSize, total, hrefFor }: {
  page: number; pageSize: number; total: number; hrefFor: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = "inline-flex h-9 items-center gap-1 rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-sunken/60";
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="text-sm text-ink-3 tabular">Showing {from}–{to} of {total}</p>
      <div className="flex gap-2">
        {page > 1 ? <Link className={btn} href={hrefFor(page - 1)} rel="prev"><Icon name="chevron_left" size={18} />Previous</Link>
          : <span className={cn(btn, "pointer-events-none opacity-50")} aria-disabled="true"><Icon name="chevron_left" size={18} />Previous</span>}
        {page < pages ? <Link className={btn} href={hrefFor(page + 1)} rel="next">Next<Icon name="chevron_right" size={18} /></Link>
          : <span className={cn(btn, "pointer-events-none opacity-50")} aria-disabled="true">Next<Icon name="chevron_right" size={18} /></span>}
      </div>
    </nav>
  );
}
