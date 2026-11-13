import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export function NotificationBell({ count, href, dark }: { count: number; href: string; dark?: boolean }) {
  return (
    <Link href={href} className={cn("relative grid size-10 place-items-center rounded-md", dark ? "text-navy-200 hover:bg-white/10 hover:text-white" : "text-ink-2 hover:bg-sunken hover:text-ink")}>
      <Icon name="notifications" size={22} label={count ? `Notifications, ${count} unread` : "Notifications"} />
      {count > 0 && (
        <span aria-hidden className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-danger-600 px-1 text-center text-[10px] font-semibold leading-4 text-white tabular">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
