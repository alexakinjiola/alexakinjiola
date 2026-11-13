import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { decryptBuffer, encryptBuffer } from "../crypto";
import type { StorageDriver } from "./index";

/**
 * Development / single-node driver. Files are AES-256-GCM encrypted (key from
 * APP_ENCRYPTION_KEY, storage key bound as AAD so blobs can't be swapped) and
 * live outside the web root. Not suitable for multi-instance deployments.
 */
export class LocalEncryptedStorage implements StorageDriver {
  private root: string;
  constructor(dir: string) {
    this.root = resolve(process.cwd(), dir);
  }
  private path(key: string) {
    if (!/^[a-z]+\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/.test(key)) throw new Error("Invalid storage key");
    const p = resolve(join(this.root, key));
    if (!p.startsWith(this.root)) throw new Error("Invalid storage key");
    return `${p}.enc`;
  }
  async put(key: string, data: Buffer) {
    const p = this.path(key);
    await mkdir(dirname(p), { recursive: true, mode: 0o700 });
    await writeFile(p, encryptBuffer(data, key), { mode: 0o600 });
  }
  async get(key: string) {
    return decryptBuffer(await readFile(this.path(key)), key);
  }
  async remove(key: string) {
    await rm(this.path(key), { force: true });
  }
}
