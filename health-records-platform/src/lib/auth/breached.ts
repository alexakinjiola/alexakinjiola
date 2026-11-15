import "server-only";
import { createHash } from "node:crypto";
import { log } from "../log";

/**
 * Have I Been Pwned "Pwned Passwords" range API (k-anonymity): only the first
 * 5 hex characters of the SHA-1 hash leave the server; the password and full
 * hash never do. Enabled with PASSWORD_BREACH_CHECK=hibp. Fails OPEN on network
 * errors (logged) so an outage can't block sign-ups — the local policy and
 * deny-list still apply.
 */
export async function isBreachedPassword(password: string): Promise<boolean> {
  if ((process.env.PASSWORD_BREACH_CHECK ?? "off") !== "hibp") return false;
  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
  const [prefix, suffix] = [sha1.slice(0, 5), sha1.slice(5)];
  try {
    const res = await fetch(`${process.env.HIBP_BASE_URL ?? "https://api.pwnedpasswords.com"}/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "continuum-phr-password-check" }, signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return (await res.text()).split("\n").some((line) => {
      const [s, count] = line.trim().split(":");
      return s === suffix && Number(count) > 0;
    });
  } catch (e) {
    log.warn("password.breach_check_unavailable", { kind: (e as Error).message.slice(0, 40) });
    return false;
  }
}
