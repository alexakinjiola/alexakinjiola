"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ClientActionResult } from "@/lib/client-action";

type N = { id: string; title: string; body: string; link: string | null; severity: string; security_critical: boolean; read_at: string | null; created_at: string };
const SEV: Record<string, { icon: IconName; cls: string }> = {
  info: { icon: "info", cls: "bg-info-bg text-info-fg" }, success: { icon: "check_circle", cls: "bg-success-bg text-success-fg" },
  warning: { icon: "warning", cls: "bg-warning-bg text-warning-fg" }, critical: { icon: "security", cls: "bg-danger-bg text-danger-fg" },
};

export function NotificationList({ items, markRead }: { items: N[]; markRead: (ids?: string[]) => Promise<ClientActionResult> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const unread = items.filter((n) => !n.read_at).length;
  if (!items.length) return <EmptyState icon="notifications" title="You're all caught up">We'll let you know about new requests, records and security events.</EmptyState>;
  return (
    <>
      <div className="flex items-center justify-between border-b border-line px-5 py-3 sm:px-6">
        <p className="text-sm text-ink-3">{unread ? `${unread} unread` : "All read"}</p>
        {unread > 0 && <Button size="sm" variant="ghost" icon="done_all" loading={pending} onClick={() => start(async () => { await markRead(); router.refresh(); })}>Mark all as read</Button>}
      </div>
      <ul className="divide-y divide-line">
        {items.map((n) => {
          const s = SEV[n.severity] ?? SEV.info;
          const content = (
            <>
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", s.cls)}><Icon name={s.icon} size={18} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className={cn("text-sm text-ink", !n.read_at && "font-semibold")}>{n.title}</span>
                  {n.security_critical && <Badge tone="danger">Security</Badge>}
                  {!n.read_at && <span className="size-2 rounded-full bg-brand-600" aria-label="Unread" />}
                </span>
                <span className="mt-0.5 block text-sm text-ink-2">{n.body}</span>
                <span className="mt-1 block text-xs text-ink-3">{relativeTime(n.created_at)}</span>
              </span>
            </>
          );
          return (
            <li key={n.id}>
              {n.link ? (
                <Link href={n.link} onClick={() => { if (!n.read_at) void markRead([n.id]); }} className={cn("flex gap-4 px-5 py-4 hover:bg-canvas/60 sm:px-6", !n.read_at && "bg-brand-50/30")}>{content}</Link>
              ) : <div className={cn("flex gap-4 px-5 py-4 sm:px-6", !n.read_at && "bg-brand-50/30")}>{content}</div>}
            </li>
          );
        })}
      </ul>
    </>
  );
}
