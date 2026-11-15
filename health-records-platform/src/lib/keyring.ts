/**
 * Envelope encryption with key rotation (no "server-only" import so the
 * rotation script can use it).
 *
 * Formats:
 *   v1: 0x01 | iv(12) | tag(16) | ciphertext            — legacy, key id 1
 *   v2: 0x02 | keyId(1) | iv(12) | tag(16) | ciphertext — current
 *
 * Keyring env: APP_ENCRYPTION_KEYS="2:<base64>,1:<base64>" (first = active).
 * APP_ENCRYPTION_KEY alone is treated as key id 1.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface Keyring { activeId: number; keys: Map<number, Buffer> }

export function parseKeyring(env: { APP_ENCRYPTION_KEYS?: string; APP_ENCRYPTION_KEY?: string }): Keyring {
  const keys = new Map<number, Buffer>();
  let activeId = 0;
  for (const part of (env.APP_ENCRYPTION_KEYS ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d{1,3}):(.+)$/);
    if (!m) throw new Error("APP_ENCRYPTION_KEYS entries must look like <id>:<base64 key>");
    const id = Number(m[1]);
    const key = Buffer.from(m[2], "base64");
    if (id < 1 || id > 255 || key.length !== 32) throw new Error(`Encryption key ${id} must have id 1–255 and be 32 bytes`);
    keys.set(id, key);
    if (!activeId) activeId = id;
  }
  if (env.APP_ENCRYPTION_KEY) {
    const legacy = Buffer.from(env.APP_ENCRYPTION_KEY, "base64");
    if (legacy.length !== 32) throw new Error("APP_ENCRYPTION_KEY must be 32 bytes");
    if (!keys.has(1)) keys.set(1, legacy);
    if (!activeId) activeId = 1;
  }
  if (!activeId) throw new Error("No encryption key configured (APP_ENCRYPTION_KEYS or APP_ENCRYPTION_KEY)");
  return { activeId, keys };
}

export function seal(ring: Keyring, plain: Buffer, aad?: string): Buffer {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", ring.keys.get(ring.activeId)!, iv);
  if (aad) c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([Buffer.from([2, ring.activeId]), iv, c.getAuthTag(), ct]);
}

export function keyIdOf(blob: Buffer) {
  if (blob[0] === 1) return 1;
  if (blob[0] === 2) return blob[1];
  throw new Error("Unsupported ciphertext version");
}

export function open(ring: Keyring, blob: Buffer, aad?: string): Buffer {
  const id = keyIdOf(blob);
  const off = blob[0] === 1 ? 1 : 2;
  const key = ring.keys.get(id);
  if (!key) throw new Error(`Encryption key ${id} is not in the keyring`);
  const d = createDecipheriv("aes-256-gcm", key, blob.subarray(off, off + 12));
  if (aad) d.setAAD(Buffer.from(aad));
  d.setAuthTag(blob.subarray(off + 12, off + 28));
  return Buffer.concat([d.update(blob.subarray(off + 28)), d.final()]);
}

/** True when the blob is not encrypted with the active key and should be re-encrypted. */
export const needsRotation = (ring: Keyring, blob: Buffer) => keyIdOf(blob) !== ring.activeId;
