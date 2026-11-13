import { Icon } from "@/components/ui/icon";
import { CATEGORY } from "@/lib/labels";
import { cn } from "@/lib/cn";

export function CategoryIcon({ category, className, size = "md" }: { category: string; className?: string; size?: "sm" | "md" }) {
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100",
      size === "sm" ? "size-8" : "size-10", className)}>
      <Icon name={CATEGORY[category]?.icon ?? "description"} size={size === "sm" ? 18 : 22} />
    </span>
  );
}
