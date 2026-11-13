import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { devMailboxEnabled } from "@/lib/env";
import { withService } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Development mailbox" };
export const dynamic = "force-dynamic";

/** DEVELOPMENT ONLY. Disabled (404) in production and unless ENABLE_DEV_MAILBOX=true. */
export default async function Mailbox() {
  if (!devMailboxEnabled()) notFound();
  const rows = await withService((tx) => tx`select id, channel, recipient, subject, body, created_at from message_outbox order by created_at desc limit 50`);
  const linkify = (s: string) => s.split(/(https?:\/\/\S+)/g).map((p, i) => p.startsWith("http") ? <a key={i} href={p} className="link break-all">{p}</a> : p);
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-10">
      <p className="eyebrow text-warning-fg">Development only</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">Outgoing messages</h1>
      <p className="mt-1 text-sm text-ink-3">In production these are delivered by the email/SMS adapter. This page is disabled outside development.</p>
      <ul className="mt-8 space-y-3">{rows.map((m) => (
        <li key={m.id} className="rounded-lg border border-line bg-surface p-5">
          <p className="text-xs text-ink-3">{m.channel.toUpperCase()} → {m.recipient} · {formatDateTime(m.created_at)}</p>
          {m.subject && <p className="mt-1 font-semibold text-ink">{m.subject}</p>}
          <p className="mt-2 whitespace-pre-line text-sm text-ink-2">{linkify(m.body)}</p>
        </li>
      ))}</ul>
    </main>
  );
}
