import { NextResponse, type NextRequest } from "next/server";
import { withService } from "@/lib/db";
import { sha256Hex } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { toAppError } from "@/lib/errors";
import { log } from "@/lib/log";
import { fromFhirBundle, healthIdFromBundle } from "@/lib/fhir";

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
    if (Number(req.headers.get("content-length") ?? 0) > 5 * 1024 * 1024) return outcome(413, "error", "Bundle too large (max 5 MB).");
    const bundle = await req.json().catch(() => null);
    if (!bundle) return outcome(400, "error", "Body must be a JSON FHIR Bundle.");
    const hid = healthIdFromBundle(bundle);
    if (!hid) return outcome(422, "error", "Bundle must include a Patient with the platform Health ID identifier.");
    let parsed;
    try { parsed = fromFhirBundle(bundle); } catch (e) { return outcome(422, "error", (e as Error).message); }
    if (parsed.records.length > 500) return outcome(413, "error", "Too many resources in one Bundle (max 500).");

    const [{ r }] = await withService((tx) => tx`select app.integration_ingest(${sha256Hex(key)}, ${hid}, ${tx.json(parsed.records as never)}::jsonb) as r`);
    log.info("fhir.ingested", { created: r.created, skipped: r.skipped_duplicates, errors: r.errors.length, unsupported: parsed.unsupported });
    return outcome(r.errors.length ? 207 : 200, r.errors.length ? "warning" : "information",
      `Created ${r.created}, skipped ${r.skipped_duplicates} duplicates, ${r.errors.length} errors.`,
      { summary: { created: r.created, skipped_duplicates: r.skipped_duplicates, errors: r.errors, unsupported_resource_types: parsed.unsupported } });
  } catch (err) {
    const e = toAppError(err);
    return outcome(e.status, "error", e.message);
  }
}
