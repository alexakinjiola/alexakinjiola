import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

export function Stat({
  label, value, hint, icon, href, tone = "neutral",
}: { label: string; value: number | string; hint?: string; icon?: IconName; href?: string; tone?: "neutral" | "attention" }) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-ink-3">{label}</span>
        {icon && <Icon name={icon} size={20} className={tone === "attention" ? "text-warning-fg" : "text-ink-3"} />}
      </div>
      <p className="mt-3 text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-ink tabular">{value}</p>
      {hint && <p className="mt-2 text-xs text-ink-3">{hint}</p>}
    </>
  );
  const cls = cn(
    "block rounded-lg border bg-surface p-4 shadow-xs sm:p-5",
    tone === "attention" ? "border-warning-line" : "border-line",
    href && "transition-colors hover:border-line-strong hover:bg-canvas/40",
  );
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}
