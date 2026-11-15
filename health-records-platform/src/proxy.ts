import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every page render:
 *  1. Issues a per-request nonce and a strict Content-Security-Policy. Scripts
 *     run only with the nonce ('strict-dynamic'); no 'unsafe-inline' scripts.
 *     style-src keeps 'unsafe-inline' because inline style attributes (used by
 *     Radix positioning and charts) cannot carry nonces.
 *  2. Coarse UX redirect for obviously signed-out visitors. This is NOT an
 *     authorization decision — every page, action and route re-validates the
 *     session server-side, and the database enforces RLS.
 */
const PROTECTED = /^\/(dashboard|records|timeline|access|activity|notifications|settings|support|onboarding|provider(?!\/register)|admin)(\/|$)/;

export function proxy(req: NextRequest) {
  if (PROTECTED.test(req.nextUrl.pathname) && !req.cookies.get("continuum_session")) {
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(process.env.APP_ENV === "production" ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: [{
    source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
    missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }],
  }],
};
