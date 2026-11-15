import "server-only";
import { randomInt } from "node:crypto";
import { withService, type Tx } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { randomToken, sha256Hex } from "@/lib/crypto";
import { queueMessage } from "@/lib/mailer";
import { rateLimit } from "@/lib/rate-limit";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/lib/auth/password";
import { isBreachedPassword } from "@/lib/auth/breached";
import { ValidationError } from "@/lib/action";

async function rejectBreached(password: string, field = "password") {
  if (await isBreachedPassword(password)) {
    throw new ValidationError({ [field]: "This password has appeared in a known data breach. Choose a different one." });
  }
}
import { newTotpSecret, sealTotpSecret, totpQrDataUrl, verifyTotp } from "@/lib/auth/mfa";
import {
  clearSessionCookie, createSession, deviceHash, readSessionCookie, revokeAllSessions, revokeSession, validateSessionToken,
} from "@/lib/auth/session";
import type { Actor } from "@/lib/auth/actor";
import { describeDevice } from "@/lib/request";

type Meta = { ip: string | null; userAgent: string | null };

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;
const appUrl = () => env().APP_URL.replace(/\/$/, "");
const platformName = () => process.env.NEXT_PUBLIC_PLATFORM_NAME ?? "Continuum";

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------
async function issueEmailVerification(tx: Tx, userId: string, email: string) {
  const token = randomToken();
  await tx`update auth_tokens set consumed_at = now() where user_id = ${userId} and purpose = 'email_verification' and consumed_at is null`;
  await tx`insert into auth_tokens(user_id, purpose, token_hash, expires_at)
           values (${userId}, 'email_verification', ${sha256Hex(token)}, now() + interval '24 hours')`;
  await queueMessage(tx, {
    to: email, userId, template: "email_verification", subject: `Confirm your email for ${platformName()}`,
    body: `Confirm your email address to finish setting up your account:\n\n${appUrl()}/verify-email/${token}\n\nThis link expires in 24 hours. If you did not create an account, you can ignore this message.`,
  });
}

export async function registerPatient(
  input: { fullName: string; dateOfBirth: string; sex: string; email: string; phone: string; password: string },
  meta: Meta,
) {
  await rateLimit(`register:${meta.ip ?? "unknown"}`, 10, 3600, "Too many sign-ups from this network. Try again later.");
  await rejectBreached(input.password);
  const passwordHash = await hashPassword(input.password);

  const userId = await withService(async (tx) => {
    const [exists] = await tx`select 1 from users where email = ${input.email} or phone = ${input.phone}`;
    if (exists) {
      throw new AppError(409, "An account already exists with this email or phone number. Sign in, or reset your password if you've forgotten it.");
    }
    const [user] = await tx<{ id: string }[]>`
      insert into users(email, phone, display_name, password_hash)
      values (${input.email}, ${input.phone}, ${input.fullName.split(" ")[0]}, ${passwordHash}) returning id`;
    const [patient] = await tx<{ id: string }[]>`insert into patients(user_id) values (${user.id}) returning id`;
    await tx`insert into patient_profiles(patient_id, full_name, date_of_birth, sex, phone)
             values (${patient.id}, ${input.fullName}, ${input.dateOfBirth}, ${input.sex}, ${input.phone})`;
    await tx`insert into health_identifiers(patient_id, identifier_type, value, is_primary)
             values (${patient.id}, 'platform_hid', app.generate_health_id(), true)`;

    // Possible duplicate person: flag for reconciliation, never auto-merge.
    const [dupe] = await tx`
      select pp.patient_id from patient_profiles pp
      where lower(pp.full_name) = lower(${input.fullName}) and pp.date_of_birth = ${input.dateOfBirth}
        and pp.patient_id <> ${patient.id} limit 1`;
    if (dupe) {
      await tx`insert into support_tickets(reference, requester_user_id, requester_type, patient_id, category, subject, description, priority)
               values (app.short_ref('SUP'), ${user.id}, 'patient', ${patient.id}, 'duplicate_account',
                       'Possible duplicate account',
                       'Automatic check: a new registration matches the name and date of birth of an existing patient. Review before identity verification is approved. Accounts are never merged automatically.',
                       'high')`;
    }
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: user.id, role: "service_role", ip: meta.ip })}, true)`;
    await tx`select app.audit('account.registered', 'user', ${user.id}, ${patient.id}::uuid, null, ${tx.json({ persona: "patient", possible_duplicate: !!dupe })}::jsonb)`;
    await issueEmailVerification(tx, user.id, input.email);
    return user.id;
  });

  await createSession(userId, { mfaVerified: true, ip: meta.ip, userAgent: meta.userAgent });
  await rememberDevice(userId, meta, false);
  log.info("auth.registered", { userId, persona: "patient" });
}

export async function registerProviderAccount(
  input: { fullName: string; email: string; phone: string; password: string },
  meta: Meta,
) {
  await rateLimit(`register:${meta.ip ?? "unknown"}`, 10, 3600, "Too many sign-ups from this network. Try again later.");
  await rejectBreached(input.password);
  const passwordHash = await hashPassword(input.password);
  const userId = await withService(async (tx) => {
    const [exists] = await tx`select 1 from users where email = ${input.email} or phone = ${input.phone}`;
    if (exists) throw new AppError(409, "An account already exists with this email or phone number. Sign in instead.");
    const [user] = await tx<{ id: string }[]>`
      insert into users(email, phone, display_name, password_hash)
      values (${input.email}, ${input.phone}, ${input.fullName}, ${passwordHash}) returning id`;
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: user.id, role: "service_role", ip: meta.ip })}, true)`;
    await tx`select app.audit('account.registered', 'user', ${user.id}, null, null, ${tx.json({ persona: "provider" })}::jsonb)`;
    await issueEmailVerification(tx, user.id, input.email);
    return user.id;
  });
  await createSession(userId, { mfaVerified: true, ip: meta.ip, userAgent: meta.userAgent });
  await rememberDevice(userId, meta, false);
  log.info("auth.registered", { userId, persona: "provider" });
}

// ---------------------------------------------------------------------------
// Sign in / out
// ---------------------------------------------------------------------------
const GENERIC_SIGN_IN_ERROR = "That email and password combination didn't work. Check them and try again.";

export async function signIn(input: { email: string; password: string }, meta: Meta): Promise<{ mfaRequired: boolean }> {
  await rateLimit(`signin-ip:${meta.ip ?? "unknown"}`, 30, 600);
  await rateLimit(`signin-acct:${input.email}`, 15, 900);

  const user = await withService(async (tx) => {
    const [u] = await tx`
      select id, password_hash, status, locked_until, failed_login_count, mfa_enabled, email
      from users where email = ${input.email}`;
    return u;
  });
  if (!user) {
    await burnPasswordCheck(input.password);
    throw new AppError(401, GENERIC_SIGN_IN_ERROR);
  }
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new AppError(429, "This account is temporarily locked after several failed attempts. Try again in 15 minutes or reset your password.");
  }
  const ok = await verifyPassword(user.password_hash, input.password);
  if (!ok) {
    await withService(async (tx) => {
      const [r] = await tx<{ failed_login_count: number }[]>`
        update users set failed_login_count = failed_login_count + 1,
               locked_until = case when failed_login_count + 1 >= ${LOCKOUT_THRESHOLD}
                                   then now() + make_interval(mins => ${LOCKOUT_MINUTES}) else locked_until end
        where id = ${user.id} returning failed_login_count`;
      if (r.failed_login_count === LOCKOUT_THRESHOLD) {
        await tx`select app.notify(${user.id}::uuid, 'security', 'Account temporarily locked',
                 'We locked your account for 15 minutes after several incorrect passwords. If this was not you, reset your password.',
                 '/settings/security', 'critical', true)`;
      }
    });
    throw new AppError(401, GENERIC_SIGN_IN_ERROR);
  }
  if (user.status !== "active") {
    throw new AppError(403, "This account is not active. Contact support for help.");
  }

  await withService((tx) => tx`update users set failed_login_count = 0, locked_until = null, last_login_at = now() where id = ${user.id}`);
  await createSession(user.id, { mfaVerified: !user.mfa_enabled, ip: meta.ip, userAgent: meta.userAgent });
  await rememberDevice(user.id, meta, true);
  log.info("auth.signed_in", { userId: user.id, mfa: user.mfa_enabled });
  return { mfaRequired: user.mfa_enabled };
}

async function rememberDevice(userId: string, meta: Meta, alertIfNew: boolean) {
  const { hash } = await deviceHash();
  await withService(async (tx) => {
    const [known] = await tx`select id from known_devices where user_id = ${userId} and device_hash = ${hash}`;
    if (known) {
      await tx`update known_devices set last_seen_at = now() where id = ${known.id}`;
      return;
    }
    const [{ n }] = await tx<{ n: number }[]>`select count(*)::int n from known_devices where user_id = ${userId}`;
    await tx`insert into known_devices(user_id, device_hash, label) values (${userId}, ${hash}, ${describeDevice(meta.userAgent)})`;
    if (alertIfNew && n > 0) {
      await tx`select app.notify(${userId}::uuid, 'new_device', 'New sign-in to your account',
               ${`Your account was signed in from ${describeDevice(meta.userAgent)}. If this wasn't you, change your password now.`},
               '/settings/security', 'critical', true)`;
    }
  });
}

export async function signOut() {
  const token = await readSessionCookie();
  if (token) {
    const s = await validateSessionToken(token);
    if (s) await revokeSession(s.id, "signed_out");
  }
  await clearSessionCookie();
}

// ---------------------------------------------------------------------------
// Email & phone verification
// ---------------------------------------------------------------------------
export async function resendEmailVerification(actor: Actor) {
  if (actor.emailVerified) return;
  await rateLimit(`verify-email:${actor.userId}`, 5, 3600, "We've sent several emails already. Check your spam folder or try again in an hour.");
  await withService((tx) => issueEmailVerification(tx, actor.userId, actor.email));
}

export async function verifyEmailToken(token: string) {
  if (!/^[A-Za-z0-9_-]{30,64}$/.test(token)) return false;
  return withService(async (tx) => {
    const [t] = await tx`
      update auth_tokens set consumed_at = now()
      where token_hash = ${sha256Hex(token)} and purpose = 'email_verification' and consumed_at is null and expires_at > now()
      returning user_id`;
    if (!t) return false;
    await tx`update users set email_verified_at = coalesce(email_verified_at, now()) where id = ${t.user_id}`;
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: t.user_id, role: "service_role" })}, true)`;
    await tx`select app.audit('account.email_verified', 'user', ${t.user_id}, null, null, '{}'::jsonb)`;
    return true;
  });
}

export async function sendPhoneCode(actor: Actor) {
  if (!actor.phone) throw new AppError(400, "Add a phone number first.");
  await rateLimit(`phone-otp:${actor.userId}`, 5, 3600, "We've sent several codes already. Try again in an hour.");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await withService(async (tx) => {
    await tx`update auth_tokens set consumed_at = now() where user_id = ${actor.userId} and purpose = 'phone_verification' and consumed_at is null`;
    await tx`insert into auth_tokens(user_id, purpose, token_hash, expires_at)
             values (${actor.userId}, 'phone_verification', ${sha256Hex(`${actor.userId}:${code}`)}, now() + interval '10 minutes')`;
    await queueMessage(tx, {
      channel: "sms", to: actor.phone!, userId: actor.userId, template: "phone_verification",
      body: `${platformName()}: your verification code is ${code}. It expires in 10 minutes. Never share this code.`,
    });
  });
}

export async function verifyPhoneCode(actor: Actor, code: string) {
  return withService(async (tx) => {
    const [t] = await tx`
      select id, token_hash, attempts from auth_tokens
      where user_id = ${actor.userId} and purpose = 'phone_verification' and consumed_at is null and expires_at > now()
      order by created_at desc limit 1`;
    if (!t) throw new AppError(400, "That code has expired. Request a new one.");
    if (t.attempts >= 5) throw new AppError(429, "Too many incorrect codes. Request a new one.");
    if (t.token_hash !== sha256Hex(`${actor.userId}:${code}`)) {
      await tx`update auth_tokens set attempts = attempts + 1 where id = ${t.id}`;
      throw new AppError(400, "That code isn't right. Check the SMS and try again.");
    }
    await tx`update auth_tokens set consumed_at = now() where id = ${t.id}`;
    await tx`update users set phone_verified_at = now() where id = ${actor.userId}`;
  });
}

// ---------------------------------------------------------------------------
// Password recovery & change
// ---------------------------------------------------------------------------
export async function requestPasswordReset(email: string, meta: Meta) {
  await rateLimit(`reset-ip:${meta.ip ?? "unknown"}`, 10, 3600);
  await rateLimit(`reset-acct:${email}`, 3, 3600);
  // Same response whether or not the account exists.
  await withService(async (tx) => {
    const [u] = await tx`select id, email from users where email = ${email} and status in ('active','locked')`;
    if (!u) return;
    const token = randomToken();
    await tx`update auth_tokens set consumed_at = now() where user_id = ${u.id} and purpose = 'password_reset' and consumed_at is null`;
    await tx`insert into auth_tokens(user_id, purpose, token_hash, expires_at)
             values (${u.id}, 'password_reset', ${sha256Hex(token)}, now() + interval '30 minutes')`;
    await queueMessage(tx, {
      to: u.email, userId: u.id, template: "password_reset", subject: "Reset your password",
      body: `Someone asked to reset the password for your account. If that was you, choose a new password here:\n\n${appUrl()}/reset-password/${token}\n\nThis link expires in 30 minutes and can be used once. If you didn't ask for this, you can ignore this message — your password won't change.`,
    });
  });
}

export async function resetPassword(token: string, password: string) {
  await rejectBreached(password);
  const hashed = await hashPassword(password);
  const userId = await withService(async (tx) => {
    const [t] = await tx`
      update auth_tokens set consumed_at = now()
      where token_hash = ${sha256Hex(token)} and purpose = 'password_reset' and consumed_at is null and expires_at > now()
      returning user_id`;
    if (!t) throw new AppError(400, "This reset link has expired or was already used. Request a new one.");
    await tx`update users set password_hash = ${hashed}, password_changed_at = now(), failed_login_count = 0, locked_until = null,
             email_verified_at = coalesce(email_verified_at, now())
             where id = ${t.user_id}`;
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: t.user_id, role: "service_role" })}, true)`;
    await tx`select app.audit('account.password_reset', 'user', ${t.user_id}, null, null, '{}'::jsonb)`;
    await tx`select app.notify(${t.user_id}::uuid, 'security', 'Your password was reset',
             'Your password was changed using a reset link and every signed-in device was signed out. If this was not you, contact support immediately.',
             '/settings/security', 'critical', true)`;
    return t.user_id as string;
  });
  await revokeAllSessions(userId, "password_reset");
}

export async function changePassword(actor: Actor, current: string, next: string) {
  await rateLimit(`pwchange:${actor.userId}`, 5, 900);
  const [row] = await withService((tx) => tx`select password_hash from users where id = ${actor.userId}`);
  if (!(await verifyPassword(row.password_hash, current))) throw new AppError(400, "Your current password isn't correct.");
  await rejectBreached(next);
  const hashed = await hashPassword(next);
  await withService(async (tx) => {
    await tx`update users set password_hash = ${hashed}, password_changed_at = now() where id = ${actor.userId}`;
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: actor.userId, role: "service_role" })}, true)`;
    await tx`select app.audit('account.password_changed', 'user', ${actor.userId}, null, null, '{}'::jsonb)`;
    await tx`select app.notify(${actor.userId}::uuid, 'security', 'Password changed',
             'Your password was changed and your other devices were signed out.', '/settings/security', 'critical', true)`;
  });
  await revokeAllSessions(actor.userId, "password_changed", actor.sessionId);
}

// ---------------------------------------------------------------------------
// Multi-factor authentication (TOTP)
// ---------------------------------------------------------------------------
export async function beginMfaSetup(actor: Actor) {
  if (actor.mfaEnabled) throw new AppError(409, "Two-step verification is already on.");
  const secret = newTotpSecret();
  await withService((tx) => tx`update users set mfa_secret_enc = ${sealTotpSecret(secret, actor.userId)} where id = ${actor.userId}`);
  return { secret, qr: await totpQrDataUrl(secret, actor.email) };
}

export async function confirmMfaSetup(actor: Actor, code: string) {
  await rateLimit(`mfa-setup:${actor.userId}`, 10, 900);
  const [u] = await withService((tx) => tx`select mfa_secret_enc from users where id = ${actor.userId}`);
  if (!u?.mfa_secret_enc) throw new AppError(400, "Start setup again.");
  if (!(await verifyTotp(u.mfa_secret_enc, actor.userId, code))) {
    throw new AppError(400, "That code didn't match. Make sure your phone's clock is correct and try the newest code.");
  }
  await withService(async (tx) => {
    await tx`update users set mfa_enabled = true, mfa_enrolled_at = now() where id = ${actor.userId}`;
    await tx`update auth_sessions set mfa_verified = true, reauthenticated_at = now() where id = ${actor.sessionId}`;
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: actor.userId, role: "service_role" })}, true)`;
    await tx`select app.audit('account.mfa_enabled', 'user', ${actor.userId}, null, null, '{}'::jsonb)`;
    await tx`select app.notify(${actor.userId}::uuid, 'security', 'Two-step verification turned on',
             'Your account now asks for a code from your authenticator app when you sign in.', '/settings/security', 'success', true)`;
  });
}

export async function verifyMfaChallenge(actor: Actor, code: string) {
  await rateLimit(`mfa:${actor.sessionId}`, 5, 300, "Too many incorrect codes. Wait 5 minutes and try again.");
  const [u] = await withService((tx) => tx`select mfa_secret_enc from users where id = ${actor.userId} and mfa_enabled`);
  if (!u || !(await verifyTotp(u.mfa_secret_enc, actor.userId, code))) {
    throw new AppError(400, "That code isn't right. Use the newest code from your authenticator app.");
  }
  await withService((tx) => tx`update auth_sessions set mfa_verified = true, reauthenticated_at = now() where id = ${actor.sessionId}`);
}

export async function disableMfa(actor: Actor, password: string) {
  if (actor.professional || actor.platformRoles.length) {
    throw new AppError(403, "Two-step verification is required for healthcare and platform staff accounts.");
  }
  const [u] = await withService((tx) => tx`select password_hash from users where id = ${actor.userId}`);
  if (!(await verifyPassword(u.password_hash, password))) throw new AppError(400, "Your password isn't correct.");
  await withService(async (tx) => {
    await tx`update users set mfa_enabled = false, mfa_secret_enc = null, mfa_enrolled_at = null where id = ${actor.userId}`;
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: actor.userId, role: "service_role" })}, true)`;
    await tx`select app.audit('account.mfa_disabled', 'user', ${actor.userId}, null, null, '{}'::jsonb)`;
    await tx`select app.notify(${actor.userId}::uuid, 'security', 'Two-step verification turned off',
             'Two-step verification was turned off for your account. If this was not you, change your password now.',
             '/settings/security', 'critical', true)`;
  });
}

/** Step-up: confirm identity again before a sensitive action. */
export async function stepUp(actor: Actor, credential: string) {
  await rateLimit(`stepup:${actor.sessionId}`, 6, 600);
  const [u] = await withService((tx) => tx`select password_hash, mfa_enabled, mfa_secret_enc from users where id = ${actor.userId}`);
  const ok = /^\d{6}$/.test(credential.trim()) && u.mfa_enabled
    ? await verifyTotp(u.mfa_secret_enc, actor.userId, credential)
    : await verifyPassword(u.password_hash, credential);
  if (!ok) throw new AppError(400, u.mfa_enabled ? "That password or code isn't right." : "That password isn't right.");
  await withService((tx) => tx`update auth_sessions set reauthenticated_at = now() where id = ${actor.sessionId}`);
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
export async function listSessions(actor: Actor) {
  return withService((tx) => tx`
    select id, device_label, ip_address::text as ip, created_at, last_seen_at, id = ${actor.sessionId} as current
    from auth_sessions
    where user_id = ${actor.userId} and revoked_at is null and idle_expires_at > now() and absolute_expires_at > now()
    order by last_seen_at desc`);
}

export async function revokeOwnSession(actor: Actor, sessionId: string) {
  await withService(async (tx) => {
    const r = await tx`update auth_sessions set revoked_at = now(), revoked_reason = 'revoked_by_user'
                       where id = ${sessionId} and user_id = ${actor.userId} and revoked_at is null returning id`;
    if (!r.length) throw new AppError(404, "That session has already ended.");
  });
}
