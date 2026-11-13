import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ACTING_PATIENT_COOKIE, getActor, hasRecentReauth } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, clientIp, jsonError } from "@/lib/route";
import { stepUp } from "@/server/auth";
import { toFhirBundle } from "@/lib/fhir";
import { renderSummaryPdf } from "@/lib/export-pdf";
import { CATEGORY_KEYS } from "@/lib/labels";

const schema = z.object({
  format: z.enum(["pdf", "fhir"]),
  categories: z.array(z.enum(CATEGORY_KEYS as [string, ...string[]])).optional(),
  credential: z.string().max(128).optional(),
});

/** Patient data export (FR-075..078): step-up required, logged, patient notified. */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const actor = await getActor();
    if (!actor || !actor.emailVerified || (actor.mfaEnabled && !actor.mfaVerified)) throw new AppError(401, "Your session has ended. Sign in again.");
    const v = schema.parse(await req.json());
    const acting = req.cookies.get(ACTING_PATIENT_COOKIE)?.value;
    const patientId = actor.representations.find((r) => r.patientId === acting)?.patientId ?? actor.patient?.id;
    if (!patientId) throw new AppError(403, "Only patients can export records.");
    await rateLimit(`export:${actor.userId}`, 10, 3600, "You've exported several times recently. Please wait a while.");
    if (!hasRecentReauth(actor)) {
      if (!v.credential) throw new AppError(401, "Confirm it's you to continue.");
      await stepUp(actor, v.credential);
    }
    const data = await withActor(actor.userId, async (tx) => {
      const ids = v.categories?.length
        ? (await tx`select id from medical_records where patient_id = ${patientId} and category_key = any(${v.categories}::text[])`).map((r) => r.id)
        : null;
      const [{ e }] = await tx`select app.patient_export(${patientId}, ${ids}::uuid[], ${v.format === "pdf" ? "record_summary_pdf" : "structured_bundle"}) as e`;
      return e;
    }, { ip: clientIp(req) });

    const stamp = new Date().toISOString().slice(0, 10);
    const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
    if (v.format === "fhir") {
      return new NextResponse(JSON.stringify(toFhirBundle(data, env().APP_URL), null, 2), {
        headers: { ...headers, "Content-Type": "application/fhir+json", "Content-Disposition": `attachment; filename="health-record-${stamp}.fhir.json"` },
      });
    }
    const pdf = await renderSummaryPdf(data);
    return new NextResponse(new Uint8Array(pdf), {
      headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="health-record-summary-${stamp}.pdf"` },
    });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ ok: false, error: "Invalid export request." }, { status: 400 });
    return jsonError(err, "export");
  }
}
