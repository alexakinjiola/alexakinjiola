import { NextResponse, type NextRequest } from "next/server";

/**
 * Coarse UX redirect only: send obviously signed-out visitors to sign-in.
 * This is NOT an authorization decision — every page, action and route
 * re-validates the session server-side, and the database enforces RLS.
 */
const PROTECTED = /^\/(dashboard|records|timeline|access|activity|notifications|settings|support|onboarding|provider(?!\/register)|admin)(\/|$)/;

export function proxy(req: NextRequest) {
  if (PROTECTED.test(req.nextUrl.pathname) && !req.cookies.get("continuum_session")) {
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
