import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "./env";
import { AppError, toAppError } from "./errors";
import { log } from "./log";
import { clientIpFrom } from "./client-ip";

/** CSRF defence for state-changing route handlers: the request must come from our own origin. */
export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const allowed = new Set([new URL(env().APP_URL).origin, req.nextUrl.origin]);
  if (!origin || !allowed.has(origin)) throw new AppError(403, "Request blocked.", "csrf");
}

export function jsonError(err: unknown, route: string) {
  const e = toAppError(err);
  if (e.status >= 500) log.error("route.failed", { route, code: (err as { code?: string })?.code, kind: (err as Error)?.name });
  return NextResponse.json({ ok: false, error: e.message }, { status: e.status, headers: { "Cache-Control": "no-store" } });
}

export function clientIp(req: NextRequest) {
  return clientIpFrom(req.headers.get("x-forwarded-for"), req.headers.get("x-real-ip"));
}
