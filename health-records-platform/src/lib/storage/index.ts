import "server-only";
import { env } from "../env";
import { LocalEncryptedStorage } from "./local";
import { SupabaseStorage } from "./supabase";

/**
 * Private object storage. Keys are random and unguessable; there is no
 * public URL for any object. Every read goes through an authorised route that
 * re-checks permissions in the database first.
 */
export interface StorageDriver {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

let driver: StorageDriver | null = null;
export function storage(): StorageDriver {
  if (driver) return driver;
  const e = env();
  driver = e.STORAGE_DRIVER === "supabase"
    ? new SupabaseStorage(e.SUPABASE_URL!, e.SUPABASE_SERVICE_ROLE_KEY!, e.SUPABASE_STORAGE_BUCKET)
    : new LocalEncryptedStorage(e.STORAGE_LOCAL_DIR);
  return driver;
}

export function newStorageKey(scope: "records" | "institutions", ownerId: string) {
  return `${scope}/${ownerId}/${crypto.randomUUID()}`;
}
