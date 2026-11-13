import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "sand";

const TONES: Record<Tone, string> = {
  neutral: "bg-sunken text-ink-2 ring-line-strong/60",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  success: "bg-success-bg text-success-fg ring-success-line",
  warning: "bg-warning-bg text-warning-fg ring-warning-line",
  danger: "bg-danger-bg text-danger-fg ring-danger-line",
  info: "bg-info-bg text-info-fg ring-info-line",
  sand: "bg-sand-50 text-sand-700 ring-sand-100",
};

const DOT: Record<Tone, string> = {
  neutral: "bg-ink-3", brand: "bg-brand-600", success: "bg-success-fg", warning: "bg-warning-fg",
  danger: "bg-danger-fg", info: "bg-info-fg", sand: "bg-sand-700",
};

/** Status pill. Meaning is always carried by text, never by colour alone. */
export function Badge({
  tone = "neutral", icon, dot, className, children,
}: { tone?: Tone; icon?: IconName; dot?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap", TONES[tone], className)}>
      {icon ? <Icon name={icon} size={14} filled /> : dot ? <span className={cn("size-1.5 rounded-full", DOT[tone])} aria-hidden /> : null}
      {children}
    </span>
  );
}
