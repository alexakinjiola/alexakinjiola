"use client";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";

export function UserMenu({ name, email, links, signOut, dark }: {
  name: string; email: string; dark?: boolean; signOut: () => Promise<void>;
  links: { href: string; label: string; icon: IconName }[];
}) {
  const initials = name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn("flex items-center gap-2 rounded-full p-0.5 pr-2", dark ? "hover:bg-white/10" : "hover:bg-sunken")}>
        <span className={cn("grid size-8 place-items-center rounded-full text-xs font-semibold", dark ? "bg-brand-500 text-white" : "bg-navy-800 text-white")}>{initials}</span>
        <span className="sr-only">Account menu for {name}</span>
        <Icon name="keyboard_arrow_down" size={18} className={dark ? "text-navy-200" : "text-ink-3"} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block text-sm font-semibold text-ink">{name}</span>
          <span className="block truncate">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {links.map((l) => (
          <DropdownMenuItem key={l.href} asChild>
            <Link href={l.href}><Icon name={l.icon} size={18} className="text-ink-3" />{l.label}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full"><Icon name="logout" size={18} className="text-ink-3" />Sign out</button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
