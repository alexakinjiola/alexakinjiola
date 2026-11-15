import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { open, parseKeyring, seal, type Keyring } from "./keyring";
import { env } from "./env";

export const sha256Hex = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");

/** URL-safe random token with 256 bits of entropy. */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

/**
 * Keyed hash for national identifiers (NIN): lookup without storing the number.
 * NINs are never stored, so old fingerprints cannot be re-computed under a new
 * key. Rotation therefore keeps retired keys for LOOKUP only:
 *   IDENTIFIER_HASH_KEYS="<new b64>,<old b64>"  (first = used for new records)
 * Patients re-verifying are re-fingerprinted with the active key.
 */
const identifierKeys = () => {
  const list = (process.env.IDENTIFIER_HASH_KEYS ?? "").split(",").map((k) => k.trim()).filter(Boolean);
  return (list.length ? list : [env().IDENTIFIER_HASH_KEY]).map((k) => Buffer.from(k, "base64"));
};
const hmac = (key: Buffer, value: string) => createHmac("sha256", key).update(value.trim()).digest("hex");
export const hashIdentifier = (value: string) => hmac(identifierKeys()[0], value);
/** Every fingerprint the value may be stored under (active key first). */
export const identifierHashCandidates = (value: string) => identifierKeys().map((k) => hmac(k, value));

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

let ring: Keyring | null = null;
const keyring = () => (ring ??= parseKeyring({ APP_ENCRYPTION_KEYS: process.env.APP_ENCRYPTION_KEYS, APP_ENCRYPTION_KEY: process.env.APP_ENCRYPTION_KEY }));

/** AES-256-GCM with key rotation support (see keyring.ts for the format). */
export const encryptBuffer = (plain: Buffer, aad?: string): Buffer => seal(keyring(), plain, aad);
export const decryptBuffer = (blob: Buffer, aad?: string): Buffer => open(keyring(), blob, aad);

export const encryptString = (s: string, aad?: string) => encryptBuffer(Buffer.from(s, "utf8"), aad).toString("base64");
export const decryptString = (s: string, aad?: string) => decryptBuffer(Buffer.from(s, "base64"), aad).toString("utf8");
