import * as React from "react";
import { cn } from "@/lib/cn";

export function DescriptionList({ items, className, columns = 2 }: {
  items: { label: string; value: React.ReactNode; hidden?: boolean }[]; className?: string; columns?: 1 | 2 | 3;
}) {
  return (
    <dl className={cn("grid gap-x-8 gap-y-5", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-2 lg:grid-cols-3", className)}>
      {items.filter((i) => !i.hidden).map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="text-xs font-medium text-ink-3">{i.label}</dt>
          <dd className="mt-1 break-words text-sm text-ink">{i.value ?? <span className="text-ink-3">Not provided</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
