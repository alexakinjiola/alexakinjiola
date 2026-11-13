"use client";
import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-[5px] border border-line-strong bg-surface shadow-xs transition-colors hover:border-ink-3 data-[state=checked]:border-brand-600 data-[state=checked]:bg-brand-600 data-[state=checked]:text-white disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator><Icon name="check" size={16} /></CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});

/** Checkbox with a large, clickable label and optional description. */
export function CheckboxCard({
  checked, onCheckedChange, label, description, disabled, id, meta,
}: { checked: boolean; onCheckedChange: (v: boolean) => void; label: React.ReactNode; description?: React.ReactNode; disabled?: boolean; id: string; meta?: React.ReactNode }) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 transition-colors",
        checked ? "border-brand-200 bg-brand-50/60" : "border-line bg-surface hover:border-line-strong",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} disabled={disabled} className="mt-0.5" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-5 text-ink-3">{description}</span>}
      </span>
      {meta && <span className="shrink-0 text-xs text-ink-3">{meta}</span>}
    </label>
  );
}
