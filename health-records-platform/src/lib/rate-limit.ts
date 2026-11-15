import "server-only";
import { withService } from "./db";
import { AppError } from "./errors";

/**
 * Fixed-window limiter backed by Postgres so it works across instances.
 * Throws 429 once `limit` hits occur inside the window.
 */
/**
 * Test harnesses sign in far more often than any person. RATE_LIMIT_SCALE
 * multiplies every limit for automated test runs; it is ignored when
 * APP_ENV=production so production limits can never be loosened by config drift.
 */
const scale = () => {
  if ((process.env.APP_ENV ?? (process.env.NODE_ENV === "production" ? "production" : "development")) === "production") return 1;
  const n = Number(process.env.RATE_LIMIT_SCALE ?? 1);
  return Number.isFinite(n) && n >= 1 ? n : 1;
};

export async function rateLimit(key: string, limit: number, windowSeconds: number, message?: string) {
  limit = limit * scale();
  const hits = await withService(async (tx) => {
    const [row] = await tx<{ hits: number }[]>`
      insert into rate_limit_buckets(bucket_key, window_start, hits)
      values (${key}, to_timestamp(floor(extract(epoch from now()) / ${windowSeconds}) * ${windowSeconds}), 1)
      on conflict (bucket_key, window_start) do update set hits = rate_limit_buckets.hits + 1
      returning hits`;
    return row.hits;
  });
  if (hits > limit) {
    throw new AppError(429, message ?? "Too many attempts. Please wait a few minutes and try again.", "rate_limited");
  }
}
