import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import { AppError, toAppError } from "./errors";
import { log } from "./log";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export class ValidationError extends AppError {
  constructor(public readonly fieldErrors: Record<string, string>) {
    super(422, "Check the highlighted fields.", "validation");
  }
}

/** Parse untrusted input; throws ValidationError with per-field messages. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input);
  if (r.success) return r.data;
  const fieldErrors: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const key = issue.path.join(".") || "_form";
    fieldErrors[key] ??= issue.message;
  }
  throw new ValidationError(fieldErrors);
}

/** Run a server action body and turn failures into safe, user-facing results. */
export async function handle<T>(name: string, fn: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data, message };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof ValidationError) return { ok: false, error: err.message, fieldErrors: err.fieldErrors };
    const e = toAppError(err);
    if (e.status >= 500) log.error("action.failed", { action: name, kind: (err as Error)?.name, code: (err as { code?: string })?.code });
    return { ok: false, error: e.message };
  }
}
