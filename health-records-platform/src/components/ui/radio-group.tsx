"use client";
import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "@/lib/cn";

export function RadioCards({
  value, onValueChange, options, name, className, ariaLabel, columns = 1,
}: {
  value: string; onValueChange: (v: string) => void; name?: string; className?: string; ariaLabel: string; columns?: 1 | 2 | 3;
  options: { value: string; label: React.ReactNode; description?: React.ReactNode; disabled?: boolean }[];
}) {
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      name={name}
      aria-label={ariaLabel}
      className={cn("grid gap-2", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-3", className)}
    >
      {options.map((o) => {
        const id = `${name ?? "radio"}-${o.value}`;
        const checked = value === o.value;
        return (
          <label
            key={o.value}
            htmlFor={id}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 transition-colors",
              checked ? "border-brand-600 bg-brand-50/60 ring-1 ring-brand-600" : "border-line bg-surface hover:border-line-strong",
              o.disabled && "cursor-not-allowed opacity-55",
            )}
          >
            <RadioGroupPrimitive.Item
              id={id}
              value={o.value}
              disabled={o.disabled}
              className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-line-strong bg-surface data-[state=checked]:border-brand-600"
            >
              <RadioGroupPrimitive.Indicator className="size-2.5 rounded-full bg-brand-600" />
            </RadioGroupPrimitive.Item>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">{o.label}</span>
              {o.description && <span className="mt-0.5 block text-[13px] leading-5 text-ink-3">{o.description}</span>}
            </span>
          </label>
        );
      })}
    </RadioGroupPrimitive.Root>
  );
}
