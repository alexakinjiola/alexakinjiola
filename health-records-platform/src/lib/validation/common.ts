import { z } from "zod";

/** Accepts Nigerian local format (0803…, 803…) or international (+234…, +44…). Outputs E.164. */
export function normalisePhone(input: string): string | null {
  const v = input.replace(/[\s\-()]/g, "");
  if (/^\+[1-9]\d{7,14}$/.test(v)) return v;
  if (/^234\d{10}$/.test(v)) return `+${v}`;
  if (/^0[789][01]\d{8}$/.test(v)) return `+234${v.slice(1)}`;
  if (/^[789][01]\d{8}$/.test(v)) return `+234${v}`;
  return null;
}

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Enter a phone number.")
  .transform((v, ctx) => {
    const p = normalisePhone(v);
    if (!p) {
      ctx.addIssue({ code: "custom", message: "Enter a valid phone number, for example 0803 123 4567." });
      return z.NEVER;
    }
    return p;
  });

export const optionalPhoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (!v) return null;
    const p = normalisePhone(v);
    if (!p) {
      ctx.addIssue({ code: "custom", message: "Enter a valid phone number, for example 0803 123 4567." });
      return z.NEVER;
    }
    return p;
  });

export const emailSchema = z.string().trim().toLowerCase().min(1, "Enter your email address.").email("Enter a valid email address.").max(254);

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

export const pastDate = isoDate.refine((v) => new Date(v) <= new Date(), "This date cannot be in the future.");

export const optionalIsoDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(isoDate.nullable());

export const uuid = z.string().uuid();

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Enter at least 2 characters.")
  .max(160, "Use 160 characters or fewer.")
  .regex(/^[\p{L}\p{M}' .\-]+$/u, "Use letters, spaces, apostrophes and hyphens only.");

export function healthIdIsValid(v: string) {
  const id = v.replace(/[\s-]/g, "").toUpperCase();
  if (!/^NG[1-9]\d{9}$/.test(id)) return false;
  const body = id.slice(2, 11);
  let total = 0;
  let dbl = true;
  for (let i = body.length - 1; i >= 0; i--) {
    let d = Number(body[i]);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    total += d;
    dbl = !dbl;
  }
  return (10 - (total % 10)) % 10 === Number(id[11]);
}

export const healthIdSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").toUpperCase())
  .refine(healthIdIsValid, "That Health ID doesn't look right. It starts with NG followed by 10 digits.");

export const formatHealthId = (id: string) => `${id.slice(0, 2)} ${id.slice(2, 6)} ${id.slice(6, 10)} ${id.slice(10)}`;
