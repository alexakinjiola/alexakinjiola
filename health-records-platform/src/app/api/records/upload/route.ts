import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getActor, ACTING_PATIENT_COOKIE } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { assertSameOrigin, clientIp, jsonError } from "@/lib/route";
import { rateLimit } from "@/lib/rate-limit";
import { discard, intakeFile } from "@/lib/files/intake";
import { CATEGORY_KEYS } from "@/lib/labels";

const meta = z.object({
  category: z.enum(CATEGORY_KEYS as [string, ...string[]], { message: "Choose a category." }),
  title: z.string().trim().min(3, "Give the record a title of at least 3 characters.").max(200),
  clinicalDate: z.string().trim().transform((v) => v || null).pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable())
    .refine((v) => !v || new Date(v) <= new Date(), "The date can't be in the future."),
  facility: z.string().trim().max(200),
  description: z.string().trim().max(2000),
});

export async function POST(req: NextRequest) {
  let storedKey: string | null = null;
  try {
    assertSameOrigin(req);
    const actor = await getActor();
    if (!actor || !actor.emailVerified || (actor.mfaEnabled && !actor.mfaVerified)) throw new AppError(401, "Your session has ended. Sign in again.");
    const acting = req.cookies.get(ACTING_PATIENT_COOKIE)?.value;
    const patientId = actor.representations.find((r) => r.patientId === acting)?.patientId ?? actor.patient?.id;
    if (!patientId) throw new AppError(403, "Only patients can upload records here.");
    await rateLimit(`upload:${actor.userId}`, 30, 3600, "You've uploaded a lot of files in the last hour. Please wait a while.");

    const form = await req.formData();
    const parsed = meta.safeParse(Object.fromEntries(["category", "title", "clinicalDate", "facility", "description"].map((k) => [k, String(form.get(k) ?? "")])));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Check the highlighted fields.",
        fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message])) }, { status: 422 });
    }
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError(400, "Choose a file to upload.");

    const stored = await intakeFile(file, "records", patientId);
    storedKey = stored.storage_key;
    const v = parsed.data;
    const [row] = await withActor(actor.userId, (tx) => tx`
      select app.patient_create_upload(${patientId}, ${v.category}, ${v.title}, ${v.clinicalDate}::date, ${v.facility}, ${v.description},
        ${stored.storage_key}, ${stored.file_name}, ${stored.mime_type}, ${stored.size_bytes}, ${stored.sha256},
        ${stored.scan_status}::scan_status, ${stored.scan_detail}) as id`, { ip: clientIp(req) });
    storedKey = null;
    return NextResponse.json({ ok: true, recordId: row.id }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (storedKey) await discard(storedKey);
    return jsonError(err, "records.upload");
  }
}
