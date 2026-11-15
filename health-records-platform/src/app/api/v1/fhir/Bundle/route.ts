import { NextResponse, type NextRequest } from "next/server";
import { withService } from "@/lib/db";
import { sha256Hex } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { toAppError } from "@/lib/errors";
import { log } from "@/lib/log";
import { fromFhirBundle, healthIdFromBundle } from "@/lib/fhir";
import { discard, intakeBuffer, type StoredFile } from "@/lib/files/intake";
import { sniffMime } from "@/lib/files/validate";

const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };

const outcome = (status: number, severity: "error" | "information" | "warning", text: string, extra: object = {}) =>
  NextResponse.json({ resourceType: "OperationOutcome", issue: [{ severity, code: status < 300 ? "informational" : "processing", diagnostics: text }], ...extra },
    { status, headers: { "Content-Type": "application/fhir+json", "Cache-Control": "no-store" } });

/**
 * Machine-to-machine ingestion from an approved hospital/lab system.
 *   POST /api/v1/fhir/Bundle   Authorization: Bearer cnt_live_…
 * Body: FHIR R4 Bundle containing a Patient (with the platform Health ID as an
 * identifier) and clinical resources. Idempotent per resource id.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!/^cnt_live_[A-Za-z0-9_-]{30,}$/.test(key)) return outcome(401, "error", "Missing or malformed integration key.");
  try {
    await rateLimit(`fhir:${key.slice(0, 18)}`, 600, 3600, "Rate limit exceeded for this integration.");
    if (Number(req.headers.get("content-length") ?? 0) > 25 * 1024 * 1024) return outcome(413, "error", "Bundle too large (max 25 MB).");
    const bundle = await req.json().catch(() => null);
    if (!bundle) return outcome(400, "error", "Body must be a JSON FHIR Bundle.");
    const hid = healthIdFromBundle(bundle);
    if (!hid) return outcome(422, "error", "Bundle must include a Patient with the platform Health ID identifier.");
    let parsed;
    try { parsed = fromFhirBundle(bundle); } catch (e) { return outcome(422, "error", (e as Error).message); }
    if (parsed.records.length > 500) return outcome(413, "error", "Too many resources in one Bundle (max 500).");

    // Validate, scan and store inline documents first. A record whose document is
    // rejected is not ingested at all (never a record silently missing its file).
    const stored: StoredFile[] = [];
    const attachmentErrors: { source_ref: string; error: string }[] = [];
    const records: object[] = [];
    const batchOwner = crypto.randomUUID();
    for (const rec of parsed.records) {
      const files: StoredFile[] = [];
      let failed = false;
      for (const a of rec.attachments ?? []) {
        try {
          const buf = Buffer.from(a.data, "base64");
          const mime = sniffMime(buf.subarray(0, 16));
          const base = a.title.replace(/\.[a-z0-9]{2,4}$/i, "");
          const f = await intakeBuffer(buf, `${base}.${mime ? EXT[mime] : "bin"}`, "records", batchOwner);
          files.push(f); stored.push(f);
        } catch (e) {
          attachmentErrors.push({ source_ref: rec.source_ref, error: toAppError(e).message });
          failed = true;
        }
      }
      if (!failed) records.push({ ...rec, attachments: files });
    }

    let r;
    try {
      [{ r }] = await withService((tx) => tx`select app.integration_ingest(${sha256Hex(key)}, ${hid}, ${tx.json(records as never)}::jsonb) as r`);
    } catch (e) {
      await Promise.all(stored.map((f) => discard(f.storage_key)));
      throw e;
    }
    const kept = new Set<string>(r.stored_keys ?? []);
    await Promise.all(stored.filter((f) => !kept.has(f.storage_key)).map((f) => discard(f.storage_key)));
    r.errors = [...r.errors, ...attachmentErrors];
    log.info("fhir.ingested", { created: r.created, skipped: r.skipped_duplicates, errors: r.errors.length, unsupported: parsed.unsupported });
    return outcome(r.errors.length ? 207 : 200, r.errors.length ? "warning" : "information",
      `Created ${r.created}, skipped ${r.skipped_duplicates} duplicates, ${r.errors.length} errors.`,
      { summary: { created: r.created, skipped_duplicates: r.skipped_duplicates, attachments_stored: kept.size, errors: r.errors, unsupported_resource_types: parsed.unsupported } });
  } catch (err) {
    const e = toAppError(err);
    return outcome(e.status, "error", e.message);
  }
}
