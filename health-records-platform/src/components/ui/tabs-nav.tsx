import Link from "next/link";
import { cn } from "@/lib/cn";

/** URL-driven tabs: each tab is a real link, so they work without JavaScript and are bookmarkable. */
export function TabsNav({ tabs, current, label }: {
  tabs: { key: string; label: string; href: string; count?: number }[]; current: string; label: string;
}) {
  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto">
      <ul className="flex min-w-max gap-1 border-b border-line px-1">
        {tabs.map((t) => {
          const active = t.key === current;
          return (
            <li key={t.key}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative -mb-px inline-flex h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors",
                  active ? "border-brand-600 text-ink" : "border-transparent text-ink-3 hover:border-line-strong hover:text-ink",
                )}
              >
                {t.label}
                {t.count !== undefined && (
                  <span className={cn("rounded-full px-1.5 text-xs tabular leading-5", active ? "bg-brand-50 text-brand-700" : "bg-sunken text-ink-3")}>
                    {t.count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
