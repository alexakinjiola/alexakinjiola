/**
 * Errors that are safe to show to users. Anything else is reported as a
 * generic failure and logged server-side (without personal data).
 */
export class AppError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 422 | 429 | 500 | 503,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

const SQLSTATE_TO_STATUS: Record<string, AppError["status"]> = {
  NP400: 400, NP403: 403, NP404: 404, NP409: 409,
  "23505": 409, // unique_violation
  "23514": 400, // check_violation
  "22P02": 400, // invalid_text_representation (bad uuid/enum)
  "42501": 403, // insufficient_privilege (RLS / grants)
};

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const e = err as { code?: string; message?: string };
  if (e?.code && e.code in SQLSTATE_TO_STATUS) {
    const status = SQLSTATE_TO_STATUS[e.code];
    // Our own NP* messages are written for users; database messages are not.
    const message = e.code.startsWith("NP")
      ? (e.message ?? "Request could not be completed.")
      : status === 409
        ? "That already exists."
        : status === 403
          ? "You do not have permission to do that."
          : "Some of the information provided is not valid.";
    return new AppError(status, message, e.code);
  }
  return new AppError(500, "Something went wrong on our side. Please try again.", "internal");
}
