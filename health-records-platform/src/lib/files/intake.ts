import "server-only";
import { createHash } from "node:crypto";
import { AppError } from "../errors";
import { scanFile } from "./scan";
import { safeFileName, validateFile, MAX_FILE_BYTES } from "./validate";
import { newStorageKey, storage } from "../storage";

export interface StoredFile {
  storage_key: string; file_name: string; mime_type: string; size_bytes: number; sha256: string; scan_status: "clean"; scan_detail: string;
}

/** Validate → scan → encrypt & store. Throws before anything is stored if the file is unacceptable. */
export async function intakeFile(file: File, scope: "records" | "institutions", ownerId: string): Promise<StoredFile> {
  if (file.size > MAX_FILE_BYTES) throw new AppError(413, "Files must be 10 MB or smaller.");
  const buf = Buffer.from(await file.arrayBuffer());
  const check = validateFile(file.name, buf.length, buf.subarray(0, 16));
  if (!check.ok) throw new AppError(415, check.message, check.reason);
  const scan = await scanFile(buf, check.mime);
  if (scan.status === "rejected") throw new AppError(422, "This file didn't pass our security check, so it wasn't saved. Try exporting it again as a plain PDF or image.", "scan_rejected");
  if (scan.status === "failed") throw new AppError(503, "We couldn't check this file for security right now. Please try again shortly.", "scan_failed");
  const key = newStorageKey(scope, ownerId);
  await storage().put(key, buf, check.mime);
  return {
    storage_key: key, file_name: safeFileName(file.name), mime_type: check.mime, size_bytes: buf.length,
    sha256: createHash("sha256").update(buf).digest("hex"), scan_status: "clean", scan_detail: scan.detail,
  };
}

/** Remove a stored blob when the database step that should reference it fails. */
export async function discard(key: string) {
  try { await storage().remove(key); } catch { /* best effort; orphan sweeper handles leftovers */ }
}
