import { z } from "zod";

// A short deny-list of the most common passwords; a breached-password API
// (e.g. k-anonymity range lookups) is recommended for the pilot.
const COMMON = new Set([
  "password", "password1", "password123", "1234567890", "12345678910", "qwertyuiop", "iloveyou12",
  "welcome123", "nigeria123", "passw0rd123", "abcdefghij", "letmein1234", "administrator",
]);

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "Use 128 characters or fewer.")
  .refine((v) => !COMMON.has(v.toLowerCase()), "This password is too common. Choose something harder to guess.")
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9\W_]/.test(v), "Mix letters with at least one number or symbol.");
