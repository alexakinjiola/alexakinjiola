"use client";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

export type ClientActionResult<T = unknown> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Copy server-side field errors onto a react-hook-form instance. */
export function applyFieldErrors<T extends FieldValues>(setError: UseFormSetError<T>, result: ClientActionResult) {
  if (result.ok || !result.fieldErrors) return false;
  let first = true;
  for (const [k, v] of Object.entries(result.fieldErrors)) {
    setError(k as Path<T>, { type: "server", message: v }, { shouldFocus: first });
    first = false;
  }
  return true;
}
