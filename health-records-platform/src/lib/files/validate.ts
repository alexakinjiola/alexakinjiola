export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png"] as const;
export type AcceptedMime = (typeof ACCEPTED_MIME)[number];
export const ACCEPT_ATTR = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

/** Identify the real file type from its first bytes. The extension and the browser's claim are not trusted. */
export function sniffMime(buf: Uint8Array): AcceptedMime | null {
  if (buf.length >= 5 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d) return "application/pdf";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
      buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return "image/png";
  return null;
}

export function safeFileName(name: string) {
  const cleaned = name.normalize("NFKC").replace(/[^\p{L}\p{N}._\- ]/gu, "_").replace(/\s+/g, " ").trim();
  return (cleaned || "document").slice(0, 120);
}

export type FileCheck =
  | { ok: true; mime: AcceptedMime }
  | { ok: false; reason: "empty" | "too_large" | "unsupported_type" | "extension_mismatch"; message: string };

export function validateFile(name: string, size: number, head: Uint8Array): FileCheck {
  if (size === 0) return { ok: false, reason: "empty", message: "This file is empty." };
  if (size > MAX_FILE_BYTES) return { ok: false, reason: "too_large", message: "Files must be 10 MB or smaller." };
  const mime = sniffMime(head);
  if (!mime) return { ok: false, reason: "unsupported_type", message: "Only PDF, JPG and PNG files can be uploaded." };
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const expected = mime === "application/pdf" ? ["pdf"] : mime === "image/png" ? ["png"] : ["jpg", "jpeg"];
  if (!expected.includes(ext)) {
    return { ok: false, reason: "extension_mismatch", message: "The file's name doesn't match its contents. Rename it or export it again." };
  }
  return { ok: true, mime };
}
