import "server-only";
import type { Tx } from "./db";

/**
 * Outbound messages are written to message_outbox inside the same
 * transaction as the change that caused them (transactional outbox). A
 * delivery worker hands them to an SMTP/SMS provider; in development they can
 * be read at /dev/mailbox. Bodies must never include clinical information.
 */
export async function queueMessage(
  tx: Tx,
  msg: { channel?: "email" | "sms"; to: string; userId?: string | null; template: string; subject?: string; body: string },
) {
  await tx`
    insert into message_outbox(channel, recipient, user_id, template, subject, body)
    values (${msg.channel ?? "email"}, ${msg.to}, ${msg.userId ?? null}, ${msg.template}, ${msg.subject ?? null}, ${msg.body})`;
}
