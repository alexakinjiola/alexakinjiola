import "server-only";
import postgres, { type Sql, type TransactionSql } from "postgres";
import { env } from "./env";
import { log } from "./log";
import { toAppError } from "./errors";

declare global {
  var __continuumSql: Sql | undefined;
}

/** Shared pool. The login role itself has no table privileges. */
export function db(): Sql {
  if (!globalThis.__continuumSql) {
    globalThis.__continuumSql = postgres(env().DATABASE_URL, {
      max: 10,
      idle_timeout: 30,
      connect_timeout: 10,
      onnotice: () => {},
      transform: { undefined: null },
    });
  }
  return globalThis.__continuumSql;
}

export type Tx = TransactionSql;
export interface RequestMeta { ip?: string | null }

async function run<T>(role: "authenticated" | "service_role" | "anon", claims: Record<string, unknown>, fn: (tx: Tx) => Promise<T>) {
  try {
    return (await db().begin(async (tx) => {
      // Same mechanism PostgREST/Supabase uses: a transaction-local role and
      // JWT claims. RLS policies and app.uid() read these values.
      await tx`select set_config('role', ${role}, true), set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`;
      return fn(tx);
    })) as T;
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.status === 500) {
      const e = err as { code?: string; message?: string };
      log.error("db.error", { sqlstate: e.code, kind: e.message?.slice(0, 80) });
    }
    throw appErr;
  }
}

/** Run as a signed-in user. Row Level Security applies to every statement. */
export function withActor<T>(userId: string, fn: (tx: Tx) => Promise<T>, meta: RequestMeta = {}) {
  return run("authenticated", { sub: userId, role: "authenticated", ip: meta.ip ?? undefined }, fn);
}

/** Unauthenticated context (public reference data only). */
export function withAnon<T>(fn: (tx: Tx) => Promise<T>) {
  return run("anon", { role: "anon" }, fn);
}

/**
 * Trusted context that bypasses RLS. Restricted by convention (and review) to
 * the auth module, background jobs and seed scripts. Never call this from a
 * page, server action or route handler directly.
 */
export function withService<T>(fn: (tx: Tx) => Promise<T>, meta: RequestMeta & { actorId?: string } = {}) {
  return run("service_role", { role: "service_role", sub: meta.actorId, ip: meta.ip ?? undefined }, fn);
}
