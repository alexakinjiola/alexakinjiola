import "server-only";
import { headers } from "next/headers";
import { clientIpFrom } from "./client-ip";

/**
 * Client IP for audit and rate limiting, honouring TRUSTED_PROXY_HOPS (see client-ip.ts).
 */
export async function requestMeta() {
  const h = await headers();
  return { ip: clientIpFrom(h.get("x-forwarded-for"), h.get("x-real-ip")), userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

/** Very small, dependency-free UA summary for the "active sessions" list. */
export function describeDevice(ua: string | null) {
  if (!ua) return "Unknown device";
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows"
    : /Mac OS X/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Unknown OS";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${browser} on ${os}`;
}
