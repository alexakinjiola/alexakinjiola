"use client";
import * as React from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/cn";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export function DropdownMenuContent({ children, align = "end", className }: { children: React.ReactNode; align?: "start" | "end"; className?: string }) {
  return (
    <Menu.Portal>
      <Menu.Content
        align={align}
        sideOffset={6}
        className={cn("z-50 min-w-56 rounded-md border border-line bg-surface p-1 shadow-md data-[state=open]:animate-fade-in", className)}
      >
        {children}
      </Menu.Content>
    </Menu.Portal>
  );
}
export const DropdownMenuItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof Menu.Item>>(
  function DropdownMenuItem({ className, ...props }, ref) {
    return (
      <Menu.Item
        ref={ref}
        className={cn("flex cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-ink outline-none data-[highlighted]:bg-sunken", className)}
        {...props}
      />
    );
  },
);
export const DropdownMenuLabel = ({ children }: { children: React.ReactNode }) => (
  <Menu.Label className="px-2.5 pb-1.5 pt-2 text-xs text-ink-3">{children}</Menu.Label>
);
export const DropdownMenuSeparator = () => <Menu.Separator className="my-1 h-px bg-line" />;
