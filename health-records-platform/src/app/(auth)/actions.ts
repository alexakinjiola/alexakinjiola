"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { handle, parse } from "@/lib/action";
import { requestMeta } from "@/lib/request";
import { getActor, homeFor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors";
import * as auth from "@/server/auth";
import {
  changePasswordSchema, forgotPasswordSchema, otpSchema, patientRegistrationSchema, providerAccountSchema,
  resetPasswordSchema, signInSchema,
} from "@/lib/validation/auth";

const safeNext = (n: unknown) => (typeof n === "string" && /^\/(?!\/)[\w\-/?=&%.]*$/.test(n) ? n : null);

export async function signInAction(input: unknown, next?: string) {
  return handle("sign_in", async () => {
    const values = parse(signInSchema, input);
    const { mfaRequired } = await auth.signIn(values, await requestMeta());
    const dest = safeNext(next);
    return { redirect: mfaRequired ? `/auth/mfa${dest ? `?next=${encodeURIComponent(dest)}` : ""}` : (dest ?? "/home") };
  });
}

export async function registerPatientAction(input: unknown) {
  return handle("register_patient", async () => {
    const v = parse(patientRegistrationSchema, input);
    await auth.registerPatient(v, await requestMeta());
    return { redirect: "/verify-email" };
  });
}

export async function registerProviderAction(input: unknown) {
  return handle("register_provider", async () => {
    const v = parse(providerAccountSchema, input);
    await auth.registerProviderAccount(v, await requestMeta());
    return { redirect: "/verify-email" };
  });
}

export async function signOutAction() {
  await auth.signOut();
  redirect("/sign-in?signed_out=1");
}

export async function resendVerificationAction() {
  return handle("resend_verification", async () => {
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Sign in again to continue.");
    await auth.resendEmailVerification(actor);
  }, "We've sent a new link. It may take a minute to arrive.");
}

export async function forgotPasswordAction(input: unknown) {
  return handle("forgot_password", async () => {
    const { email } = parse(forgotPasswordSchema, input);
    await auth.requestPasswordReset(email, await requestMeta());
  });
}

export async function resetPasswordAction(input: unknown) {
  return handle("reset_password", async () => {
    const v = parse(resetPasswordSchema, input);
    await auth.resetPassword(v.token, v.password);
  });
}

export async function mfaChallengeAction(input: unknown, next?: string) {
  return handle("mfa_challenge", async () => {
    const { code } = parse(otpSchema, input);
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Your sign-in expired. Sign in again.");
    await auth.verifyMfaChallenge(actor, code);
    return { redirect: safeNext(next) ?? homeFor(actor) };
  });
}

export async function beginMfaSetupAction() {
  return handle("mfa_setup_begin", async () => {
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Sign in again to continue.");
    return auth.beginMfaSetup(actor);
  });
}

export async function confirmMfaSetupAction(input: unknown) {
  return handle("mfa_setup_confirm", async () => {
    const { code } = parse(otpSchema, input);
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Sign in again to continue.");
    await auth.confirmMfaSetup(actor, code);
    return { redirect: homeFor(actor) };
  }, "Two-step verification is on.");
}

export async function changePasswordAction(input: unknown) {
  return handle("change_password", async () => {
    const v = parse(changePasswordSchema, input);
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Sign in again to continue.");
    await auth.changePassword(actor, v.currentPassword, v.password);
  }, "Password changed. Your other devices have been signed out.");
}

export async function disableMfaAction(input: { reason: string; credential: string }) {
  return handle("mfa_disable", async () => {
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Sign in again to continue.");
    await auth.disableMfa(actor, z.string().min(1).parse(input.credential));
  }, "Two-step verification is off.");
}

export async function sendPhoneCodeAction() {
  return handle("phone_code", async () => {
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Sign in again to continue.");
    await auth.sendPhoneCode(actor);
  }, "We've sent a code by SMS.");
}

export async function verifyPhoneCodeAction(input: unknown) {
  return handle("phone_verify", async () => {
    const { code } = parse(otpSchema, input);
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Sign in again to continue.");
    await auth.verifyPhoneCode(actor, code);
  }, "Phone number verified.");
}

export async function revokeSessionAction(sessionId: string) {
  return handle("revoke_session", async () => {
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Sign in again to continue.");
    await auth.revokeOwnSession(actor, z.string().uuid().parse(sessionId));
  }, "That device has been signed out.");
}
