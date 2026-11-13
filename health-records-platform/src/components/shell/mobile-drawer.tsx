"use client";
import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { SideNav, type NavItem } from "./nav";

export function MobileDrawer({ items, dark, header, footer }: { items: NavItem[]; dark?: boolean; header: React.ReactNode; footer?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className={"grid size-10 place-items-center rounded-md text-ink hover:bg-sunken lg:hidden"}>
        <Icon name="menu" size={24} label="Open menu" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-950/45 data-[state=open]:animate-fade-in lg:hidden" />
        <Dialog.Content className={cn("fixed inset-y-0 left-0 z-50 flex w-[300px] max-w-[85vw] flex-col p-4 shadow-lg data-[state=open]:animate-fade-in lg:hidden",
          dark ? "bg-navy-900" : "bg-canvas")}>
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <Dialog.Description className="sr-only">Main navigation</Dialog.Description>
          <div className="mb-5 flex items-center justify-between">
            {header}
            <Dialog.Close className={cn("grid size-9 place-items-center rounded-md", dark ? "text-white hover:bg-white/10" : "hover:bg-sunken")}>
              <Icon name="close" size={22} label="Close menu" />
            </Dialog.Close>
          </div>
          <nav aria-label="Main" className="flex-1 overflow-y-auto"><SideNav items={items} dark={dark} onNavigate={() => setOpen(false)} /></nav>
          {footer}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
