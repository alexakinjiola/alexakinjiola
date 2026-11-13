import "server-only";
import { headers } from "next/headers";

/**
 * Client IP for audit and rate limiting. Assumes the platform sits behind a
 * single trusted reverse proxy that sets X-Forwarded-For (document this in
 * deployment; spoofable otherwise).
 */
export async function requestMeta() {
  const h = await headers();
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = fwd || h.get("x-real-ip") || null;
  const ipValid = ip && /^[0-9a-fA-F:.]+$/.test(ip) ? ip : null;
  return { ip: ipValid, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
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
