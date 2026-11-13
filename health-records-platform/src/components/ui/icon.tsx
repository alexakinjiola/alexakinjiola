import { ICON_PATHS, type IconName } from "./icon-paths";
import { cn } from "@/lib/cn";

export type { IconName };

/**
 * Google Material Symbols (Rounded). Decorative by default (aria-hidden);
 * pass `label` when the icon is the only thing conveying meaning.
 */
export function Icon({
  name, size = 20, filled = false, label, className,
}: { name: IconName; size?: number; filled?: boolean; label?: string; className?: string }) {
  const [outline, fill] = ICON_PATHS[name];
  return (
    <svg
      viewBox="0 -960 960 960"
      width={size}
      height={size}
      fill="currentColor"
      className={cn("shrink-0", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={filled ? fill : outline} />
    </svg>
  );
}
