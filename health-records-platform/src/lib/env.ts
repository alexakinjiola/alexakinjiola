import "server-only";
import { z } from "zod";

const base64Key = z
  .string()
  .min(1, "is required")
  .refine((v) => Buffer.from(v, "base64").length === 32, "must be 32 bytes, base64-encoded");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Deployment stage, independent of the build mode. Defaults to "production"
  // for production builds so a missing value fails safe.
  APP_ENV: z.enum(["development", "staging", "production"]).optional(),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().url(),
  APP_ENCRYPTION_KEY: base64Key,
  IDENTIFIER_HASH_KEY: base64Key,
  CRON_SECRET: z.string().min(16),
  STORAGE_DRIVER: z.enum(["local", "supabase"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default(".data/storage"),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("medical-records"),
  CLAMAV_ADDRESS: z.string().optional(),
  IDENTITY_PROVIDER: z.enum(["sandbox", "manual_review"]).default("sandbox"),
  MAIL_DRIVER: z.enum(["outbox", "log", "smtp"]).default("outbox"),
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  SMS_DRIVER: z.enum(["none", "log", "webhook"]).default("none"),
  SMS_WEBHOOK_URL: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional()),
  SMS_WEBHOOK_TOKEN: z.string().optional(),
  ENABLE_DEV_MAILBOX: z.string().default("false"),
});

type Env = z.infer<typeof schema> & { APP_ENV: "development" | "staging" | "production" };
let cached: Env | null = null;

/** Validated server environment. Throws at first use if misconfigured. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  const e = { ...parsed.data, APP_ENV: parsed.data.APP_ENV ?? (parsed.data.NODE_ENV === "production" ? "production" : "development") };
  if (e.APP_ENV === "production") {
    if (e.IDENTITY_PROVIDER === "sandbox") throw new Error("IDENTITY_PROVIDER=sandbox is not allowed in production");
    if (e.ENABLE_DEV_MAILBOX === "true") throw new Error("ENABLE_DEV_MAILBOX must be false in production");
    if (e.MAIL_DRIVER !== "smtp" || !e.SMTP_URL) throw new Error("Production requires MAIL_DRIVER=smtp with SMTP_URL");
  }
  cached = e;
  return e;
}

export const isProduction = () => env().APP_ENV === "production";
export const devMailboxEnabled = () => !isProduction() && env().ENABLE_DEV_MAILBOX === "true";
