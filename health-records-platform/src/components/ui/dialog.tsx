"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  title, description, children, className, size = "md",
}: { title: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-navy-950/45 backdrop-blur-[1px] data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-x-3 bottom-3 z-50 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-lg border border-line bg-surface shadow-lg data-[state=open]:animate-slide-up sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-[12vh] sm:-translate-x-1/2",
          size === "sm" && "sm:w-[420px]", size === "md" && "sm:w-[520px]", size === "lg" && "sm:w-[680px]",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <DialogPrimitive.Title className="text-base font-semibold text-ink">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-sm leading-6 text-ink-3">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">Dialog</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close className="-mr-2 -mt-1 grid size-9 place-items-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink">
            <Icon name="close" size={20} label="Close" />
          </DialogPrimitive.Close>
        </div>
        <div className="px-5 py-5 sm:px-6">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
