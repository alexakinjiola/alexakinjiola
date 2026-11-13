import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

export const sha256Hex = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");

/** URL-safe random token with 256 bits of entropy. */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

/** Keyed hash for national identifiers (NIN): lookup without storing the number. */
export const hashIdentifier = (value: string) =>
  createHmac("sha256", Buffer.from(env().IDENTIFIER_HASH_KEY, "base64")).update(value.trim()).digest("hex");

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

const key = () => Buffer.from(env().APP_ENCRYPTION_KEY, "base64");

/** AES-256-GCM. Output layout: version(1) | iv(12) | tag(16) | ciphertext. */
export function encryptBuffer(plain: Buffer, aad?: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  if (aad) cipher.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), ct]);
}

export function decryptBuffer(blob: Buffer, aad?: string): Buffer {
  if (blob[0] !== 1) throw new Error("Unsupported ciphertext version");
  const iv = blob.subarray(1, 13);
  const tag = blob.subarray(13, 29);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  if (aad) decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.subarray(29)), decipher.final()]);
}

export const encryptString = (s: string, aad?: string) => encryptBuffer(Buffer.from(s, "utf8"), aad).toString("base64");
export const decryptString = (s: string, aad?: string) => decryptBuffer(Buffer.from(s, "base64"), aad).toString("utf8");
