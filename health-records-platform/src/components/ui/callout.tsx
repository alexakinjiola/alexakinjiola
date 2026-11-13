import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";
import type { Tone } from "./badge";

const STYLES: Record<Exclude<Tone, "sand" | "brand">, { box: string; icon: IconName }> = {
  neutral: { box: "border-line bg-surface text-ink-2", icon: "info" },
  info: { box: "border-info-line bg-info-bg text-info-fg", icon: "info" },
  success: { box: "border-success-line bg-success-bg text-success-fg", icon: "check_circle" },
  warning: { box: "border-warning-line bg-warning-bg text-warning-fg", icon: "warning" },
  danger: { box: "border-danger-line bg-danger-bg text-danger-fg", icon: "error" },
};

export function Callout({
  tone = "info", title, icon, children, className, role, action,
}: {
  tone?: keyof typeof STYLES; title?: React.ReactNode; icon?: IconName; children?: React.ReactNode; className?: string;
  role?: "status" | "alert"; action?: React.ReactNode;
}) {
  const s = STYLES[tone];
  return (
    <div role={role} className={cn("flex gap-3 rounded-md border px-4 py-3.5 text-sm", s.box, className)}>
      <Icon name={icon ?? s.icon} size={20} filled className="mt-px" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold leading-6">{title}</p>}
        {children && <div className={cn("leading-6", title ? "mt-0.5 opacity-95" : "")}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}
