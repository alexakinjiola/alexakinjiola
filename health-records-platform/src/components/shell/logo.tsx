import Link from "next/link";
import { cn } from "@/lib/cn";

export const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME ?? "Continuum";

/** The mark: an unbroken arc ending in a point — a record that continues with you. */
export function LogoMark({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={inverted ? "#ffffff" : "#0f6e5c"} />
      <path d="M21.9 10.6A8 8 0 1 0 24 16" fill="none" stroke={inverted ? "#0f6e5c" : "#ffffff"} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="24" cy="16" r="2.4" fill={inverted ? "#0f6e5c" : "#a3cfc2"} />
      <path d="M11.5 16h4l1.6-3 2.2 6 1.2-3" fill="none" stroke={inverted ? "#0f6e5c" : "#ffffff"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/", inverted, suffix, className }: { href?: string; inverted?: boolean; suffix?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 rounded-md", className)}>
      <LogoMark inverted={inverted} />
      <span className={cn("text-[17px] font-semibold tracking-[-0.01em]", inverted ? "text-white" : "text-ink")}>{PLATFORM_NAME}</span>
      {suffix && (
        <span className={cn("rounded-sm px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.08em]",
          inverted ? "bg-white/10 text-navy-200" : "bg-sunken text-ink-3")}>{suffix}</span>
      )}
    </Link>
  );
}
