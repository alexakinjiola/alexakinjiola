import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

export function EmptyState({
  icon = "inbox", title, children, action, className, compact,
}: { icon?: IconName; title: string; children?: React.ReactNode; action?: React.ReactNode; className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "px-4 py-8" : "px-6 py-14", className)}>
      <span className="grid size-12 place-items-center rounded-full border border-line bg-canvas text-ink-3">
        <Icon name={icon} size={24} />
      </span>
      <h3 className="mt-4 text-[15px] font-semibold text-ink">{title}</h3>
      {children && <div className="mt-1.5 max-w-md text-sm leading-6 text-ink-3">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
