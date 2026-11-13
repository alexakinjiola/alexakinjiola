import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/** Server-rendered GET filter form: works without JavaScript and keeps filters in the URL. */
export const filterControl = "h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink shadow-xs focus-visible:border-brand-600";

export function FilterBar({ children, resetHref, className, label = "Filter" }: { children: React.ReactNode; resetHref: string; className?: string; label?: string }) {
  return (
    <form method="get" role="search" aria-label={label} className={cn("grid gap-3 rounded-lg border border-line bg-surface p-4 shadow-xs sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] lg:items-end", className)}>
      {children}
      <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
        <button type="submit" className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-navy-800 px-4 text-sm font-medium text-white hover:bg-navy-700">
          <Icon name="filter_list" size={18} />Apply
        </button>
        <Link href={resetHref} className="inline-flex h-10 items-center rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-sunken">Reset</Link>
      </div>
    </form>
  );
}

export function FilterField({ label, children, className }: { label: string; children: React.ReactElement<{ id?: string }>; className?: string }) {
  const id = `f-${label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-xs font-medium text-ink-3">{label}</label>
      {React.cloneElement(children, { id })}
    </div>
  );
}
