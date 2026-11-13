import "server-only";
import { cookies } from "next/headers";
import { withService } from "../db";
import { randomToken, sha256Hex } from "../crypto";
import { isProduction } from "../env";
import { describeDevice } from "../request";

export const SESSION_COOKIE = "continuum_session";
export const DEVICE_COOKIE = "continuum_device";

/** Stricter timeouts for anyone who can see other people's information. */
const POLICY = {
  standard: { idleMinutes: 60, absoluteHours: 12 },
  privileged: { idleMinutes: 30, absoluteHours: 10 },
} as const;

export interface SessionRow {
  id: string;
  user_id: string;
  mfa_verified: boolean;
  reauthenticated_at: Date | null;
  idle_expires_at: Date;
  absolute_expires_at: Date;
  last_seen_at: Date;
}

const cookieBase = () => ({ httpOnly: true, sameSite: "lax" as const, secure: isProduction(), path: "/" });

async function isPrivileged(userId: string) {
  return withService(async (tx) => {
    const [r] = await tx<{ p: boolean }[]>`
      select exists (select 1 from healthcare_professionals where user_id = ${userId})
          or exists (select 1 from user_platform_roles where user_id = ${userId}) as p`;
    return r.p;
  });
}

export async function createSession(
  userId: string,
  opts: { mfaVerified: boolean; ip: string | null; userAgent: string | null },
) {
  const token = randomToken();
  const policy = (await isPrivileged(userId)) ? POLICY.privileged : POLICY.standard;
  await withService(
    (tx) => tx`
      insert into auth_sessions(user_id, token_hash, mfa_verified, reauthenticated_at, ip_address, user_agent, device_label,
                                idle_expires_at, absolute_expires_at)
      values (${userId}, ${sha256Hex(token)}, ${opts.mfaVerified}, now(), ${opts.ip}, ${opts.userAgent},
              ${describeDevice(opts.userAgent)},
              now() + make_interval(mins => ${policy.idleMinutes}), now() + make_interval(hours => ${policy.absoluteHours}))`,
  );
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { ...cookieBase(), maxAge: policy.absoluteHours * 3600 });
}

/** Look up a session by raw token. Returns null for unknown, revoked or expired sessions. */
export async function validateSessionToken(token: string): Promise<SessionRow | null> {
  if (!token || token.length < 30 || token.length > 100) return null;
  return withService(async (tx) => {
    const [s] = await tx<(SessionRow & { status: string })[]>`
      select s.id, s.user_id, s.mfa_verified, s.reauthenticated_at, s.idle_expires_at, s.absolute_expires_at,
             s.last_seen_at, u.status
      from auth_sessions s join users u on u.id = s.user_id
      where s.token_hash = ${sha256Hex(token)} and s.revoked_at is null
        and s.idle_expires_at > now() and s.absolute_expires_at > now()`;
    if (!s || s.status !== "active") return null;
    // Sliding idle timeout, written at most once a minute.
    if (Date.now() - new Date(s.last_seen_at).getTime() > 60_000) {
      const privileged = await tx<{ p: boolean }[]>`
        select exists (select 1 from healthcare_professionals where user_id = ${s.user_id})
            or exists (select 1 from user_platform_roles where user_id = ${s.user_id}) as p`;
      const idle = privileged[0].p ? POLICY.privileged.idleMinutes : POLICY.standard.idleMinutes;
      await tx`update auth_sessions set last_seen_at = now(),
               idle_expires_at = least(now() + make_interval(mins => ${idle}), absolute_expires_at)
               where id = ${s.id}`;
    }
    return s;
  });
}

export async function readSessionCookie() {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function revokeSession(sessionId: string, reason: string) {
  await withService((tx) => tx`update auth_sessions set revoked_at = now(), revoked_reason = ${reason}
                               where id = ${sessionId} and revoked_at is null`);
}

export async function revokeAllSessions(userId: string, reason: string, exceptSessionId?: string) {
  await withService((tx) => tx`update auth_sessions set revoked_at = now(), revoked_reason = ${reason}
                               where user_id = ${userId} and revoked_at is null
                                 and (${exceptSessionId ?? null}::uuid is null or id <> ${exceptSessionId ?? null}::uuid)`);
}

/** Long-lived random device id (stored hashed) used for new-device alerts. */
export async function deviceHash() {
  const jar = await cookies();
  let id = jar.get(DEVICE_COOKIE)?.value;
  let isNewCookie = false;
  if (!id || id.length < 20) {
    id = randomToken(18);
    isNewCookie = true;
    jar.set(DEVICE_COOKIE, id, { ...cookieBase(), maxAge: 400 * 24 * 3600 });
  }
  return { hash: sha256Hex(`device:${id}`), isNewCookie };
}
