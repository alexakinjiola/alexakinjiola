"use client";
import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

type FieldCtx = { id: string; describedBy?: string; invalid: boolean; required?: boolean };
const Ctx = React.createContext<FieldCtx | null>(null);
export const useField = () => React.useContext(Ctx);

/**
 * Wires label, hint and error to the control inside it via context:
 * id/htmlFor, aria-describedby and aria-invalid are always correct.
 */
export function Field({
  label, hint, error, required, optional, children, className, id: idProp, labelHidden,
}: {
  label: React.ReactNode; hint?: React.ReactNode; error?: string; required?: boolean; optional?: boolean;
  children: React.ReactNode; className?: string; id?: string; labelHidden?: boolean;
}) {
  const auto = React.useId();
  const id = idProp ?? auto;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-error` : undefined;
  return (
    <Ctx.Provider value={{ id, describedBy: [errId, hintId].filter(Boolean).join(" ") || undefined, invalid: !!error, required }}>
      <div className={cn("space-y-1.5", className)}>
        <label htmlFor={id} className={cn("flex items-baseline gap-1.5 text-sm font-medium text-ink", labelHidden && "sr-only")}>
          {label}
          {optional && <span className="text-xs font-normal text-ink-3">(optional)</span>}
        </label>
        {hint && <p id={hintId} className="text-[13px] leading-5 text-ink-3">{hint}</p>}
        {children}
        {error && (
          <p id={errId} className="flex items-start gap-1.5 text-[13px] font-medium leading-5 text-danger-600">
            <Icon name="error" size={16} filled className="mt-0.5" />
            {error}
          </p>
        )}
      </div>
    </Ctx.Provider>
  );
}

export const controlClass =
  "block w-full rounded-md border bg-surface px-3 text-[15px] text-ink shadow-xs transition-colors placeholder:text-placeholder hover:border-ink-3/60 focus-visible:border-brand-600 focus-visible:outline-2 focus-visible:outline-brand-600/25 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-3 aria-[invalid=true]:border-danger-600 aria-[invalid=true]:focus-visible:outline-danger-600/25";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props }, ref,
) {
  const f = useField();
  return (
    <input
      ref={ref}
      id={f?.id}
      aria-describedby={f?.describedBy}
      aria-invalid={f?.invalid || undefined}
      aria-required={f?.required || undefined}
      className={cn(controlClass, "h-11 border-line-strong", className)}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 4, ...props }, ref,
) {
  const f = useField();
  return (
    <textarea
      ref={ref}
      rows={rows}
      id={f?.id}
      aria-describedby={f?.describedBy}
      aria-invalid={f?.invalid || undefined}
      aria-required={f?.required || undefined}
      className={cn(controlClass, "border-line-strong py-2.5 leading-6", className)}
      {...props}
    />
  );
});

/** Native select: the most accessible and mobile-friendly option. */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props }, ref,
) {
  const f = useField();
  return (
    <div className="relative">
      <select
        ref={ref}
        id={f?.id}
        aria-describedby={f?.describedBy}
        aria-invalid={f?.invalid || undefined}
        aria-required={f?.required || undefined}
        className={cn(controlClass, "h-11 appearance-none border-line-strong pr-10", className)}
        {...props}
      >
        {children}
      </select>
      <Icon name="keyboard_arrow_down" size={20} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" />
    </div>
  );
});
