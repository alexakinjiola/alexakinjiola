import * as React from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  eyebrow, title, description, actions, className, display = false,
}: { eyebrow?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; className?: string; display?: boolean }) {
  return (
    <header className={cn("flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className={cn(display ? "font-display text-3xl font-medium sm:text-[2.5rem] sm:leading-[3rem]" : "text-2xl font-semibold tracking-[-0.015em]", "text-ink")}>
          {title}
        </h1>
        {description && <p className="mt-2 text-[15px] leading-6 text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
