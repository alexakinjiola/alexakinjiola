"use client";
import * as React from "react";
import { Icon } from "./icon";
import { cn } from "@/lib/cn";

type Toast = { id: number; tone: "success" | "error" | "info"; message: string };
let push: ((t: Omit<Toast, "id">) => void) | null = null;

export const toast = {
  success: (message: string) => push?.({ tone: "success", message }),
  error: (message: string) => push?.({ tone: "error", message }),
  info: (message: string) => push?.({ tone: "info", message }),
};

/** Announces messages politely to screen readers and shows them briefly on screen. */
export function Toaster() {
  const [items, setItems] = React.useState<Toast[]>([]);
  React.useEffect(() => {
    let n = 0;
    push = (t) => {
      const id = ++n;
      setItems((s) => [...s.slice(-2), { ...t, id }]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 6000);
    };
    return () => { push = null; };
  }, []);
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-6">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border bg-surface px-4 py-3 text-sm shadow-lg animate-slide-up",
            t.tone === "success" && "border-success-line", t.tone === "error" && "border-danger-line", t.tone === "info" && "border-line",
          )}
        >
          <Icon
            name={t.tone === "success" ? "check_circle" : t.tone === "error" ? "error" : "info"}
            filled size={20}
            className={cn(t.tone === "success" && "text-success-fg", t.tone === "error" && "text-danger-fg", t.tone === "info" && "text-info-fg")}
          />
          <p className="flex-1 leading-5 text-ink">{t.message}</p>
          <button onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))} className="-m-1 rounded p-1 text-ink-3 hover:text-ink">
            <Icon name="close" size={16} label="Dismiss" />
          </button>
        </div>
      ))}
    </div>
  );
}
