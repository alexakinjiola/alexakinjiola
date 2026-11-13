/**
 * Outbox delivery worker (no "server-only" import so the CLI script can use it).
 * Claims due messages with FOR UPDATE SKIP LOCKED — safe to run on several
 * instances at once — sends them, and retries failures with exponential
 * backoff (1, 4, 16, 64 minutes) before marking them failed.
 */
import type { Sql } from "postgres";
import nodemailer, { type Transporter } from "nodemailer";

export interface DeliveryConfig {
  mailDriver: "outbox" | "log" | "smtp";
  smtpUrl?: string;
  mailFrom?: string;
  smsDriver: "none" | "log" | "webhook";
  smsWebhookUrl?: string;
  smsWebhookToken?: string;
}

const MAX_ATTEMPTS = 5;

export function deliveryConfigFromEnv(env: NodeJS.ProcessEnv = process.env): DeliveryConfig {
  return {
    mailDriver: (env.MAIL_DRIVER as DeliveryConfig["mailDriver"]) ?? "outbox",
    smtpUrl: env.SMTP_URL, mailFrom: env.MAIL_FROM ?? "Continuum <no-reply@localhost>",
    smsDriver: (env.SMS_DRIVER as DeliveryConfig["smsDriver"]) ?? "none",
    smsWebhookUrl: env.SMS_WEBHOOK_URL, smsWebhookToken: env.SMS_WEBHOOK_TOKEN,
  };
}

type Msg = { id: string; channel: "email" | "sms"; recipient: string; subject: string | null; body: string; attempts: number; template: string };

async function send(cfg: DeliveryConfig, m: Msg, transport: Transporter | null) {
  if (m.channel === "email") {
    if (cfg.mailDriver === "log") { console.log(JSON.stringify({ event: "mail.log", id: m.id, template: m.template })); return; }
    if (!transport) throw new Error("SMTP not configured");
    await transport.sendMail({ from: cfg.mailFrom, to: m.recipient, subject: m.subject ?? "Notification", text: m.body });
    return;
  }
  if (cfg.smsDriver === "log") { console.log(JSON.stringify({ event: "sms.log", id: m.id, template: m.template })); return; }
  if (cfg.smsDriver !== "webhook" || !cfg.smsWebhookUrl) throw new Error("SMS gateway not configured");
  // Generic JSON gateway contract: adapt the payload to the chosen Nigerian SMS provider.
  const res = await fetch(cfg.smsWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cfg.smsWebhookToken ? { Authorization: `Bearer ${cfg.smsWebhookToken}` } : {}) },
    body: JSON.stringify({ to: m.recipient, message: m.body, reference: m.id }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`SMS gateway responded ${res.status}`);
}

/** Deliver up to `limit` due messages. Returns counts. With mailDriver "outbox" nothing is sent (development). */
export async function deliverDue(sql: Sql, cfg: DeliveryConfig, limit = 50) {
  const result = { sent: 0, retried: 0, failed: 0, skipped: 0 };
  if (cfg.mailDriver === "outbox" && cfg.smsDriver === "none") return result;
  const transport = cfg.mailDriver === "smtp" && cfg.smtpUrl ? nodemailer.createTransport(cfg.smtpUrl) : null;

  await sql.begin(async (tx) => {
    await tx`select set_config('role', 'service_role', true)`;
    const due = await tx<Msg[]>`
      select id, channel, recipient, subject, body, attempts, template from message_outbox
      where status = 'queued' and next_attempt_at <= now()
      order by created_at limit ${limit} for update skip locked`;
    for (const m of due) {
      const enabled = m.channel === "email" ? cfg.mailDriver !== "outbox" : cfg.smsDriver !== "none";
      if (!enabled) { result.skipped++; continue; }
      try {
        await send(cfg, m, transport);
        await tx`update message_outbox set status = 'sent', sent_at = now(), attempts = attempts + 1, last_error = null where id = ${m.id}`;
        result.sent++;
      } catch (e) {
        const attempts = m.attempts + 1;
        const final = attempts >= MAX_ATTEMPTS;
        await tx`update message_outbox set attempts = ${attempts}, last_error = ${String((e as Error).message).slice(0, 300)},
                 status = ${final ? "failed" : "queued"}, next_attempt_at = now() + make_interval(mins => ${4 ** (attempts - 1)})
                 where id = ${m.id}`;
        if (final) result.failed++; else result.retried++;
      }
    }
  });
  return result;
}
