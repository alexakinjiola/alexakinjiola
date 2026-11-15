import "server-only";
import type { StorageDriver } from "./index";
import { decryptBuffer, encryptBuffer } from "../crypto";

/**
 * Supabase Storage driver using a PRIVATE bucket via the Storage REST API.
 * Objects are AES-256-GCM encrypted by the application before upload (in
 * addition to Supabase's own at-rest encryption). The service-role key never leaves the server. Objects are downloaded by
 * the server (after authorization) and streamed to the user, so no signed
 * URL ever reaches the browser.
 *
 * Status: written against the documented Storage API but NOT exercised in
 * this repository's test environment (no Supabase project was available).
 * Verify against a staging project before the pilot.
 */
export class SupabaseStorage implements StorageDriver {
  constructor(private url: string, private serviceKey: string, private bucket: string) {
    if (!url || !serviceKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for the supabase storage driver");
  }
  private endpoint(key: string) {
    return `${this.url.replace(/\/$/, "")}/storage/v1/object/${this.bucket}/${key}`;
  }
  private headers(extra: Record<string, string> = {}) {
    return { Authorization: `Bearer ${this.serviceKey}`, apikey: this.serviceKey, ...extra };
  }
  async put(key: string, data: Buffer, contentType: string) {
    const res = await fetch(this.endpoint(key), {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/octet-stream", "x-upsert": "true", "x-content-type": contentType }),
      body: new Uint8Array(encryptBuffer(data, key)),
    });
    if (!res.ok) throw new Error(`Storage upload failed (${res.status})`);
  }
  async get(key: string) {
    const res = await fetch(this.endpoint(key), { headers: this.headers() });
    if (!res.ok) throw new Error(`Storage download failed (${res.status})`);
    return decryptBuffer(Buffer.from(await res.arrayBuffer()), key);
  }
  async remove(key: string) {
    await fetch(`${this.url.replace(/\/$/, "")}/storage/v1/object/${this.bucket}`, {
      method: "DELETE",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prefixes: [key] }),
    });
  }
}
