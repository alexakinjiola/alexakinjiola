import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getActor } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { assertSameOrigin, clientIp, jsonError } from "@/lib/route";
import { rateLimit } from "@/lib/rate-limit";
import { discard, intakeFile, type StoredFile } from "@/lib/files/intake";
import { CATEGORY_KEYS } from "@/lib/labels";

const schema = z.object({
  institutionId: z.string().uuid(), patientId: z.string().uuid(),
  category: z.enum(CATEGORY_KEYS as [string, ...string[]], { message: "Choose a category." }),
  title: z.string().trim().min(3, "Enter a title (3+ characters).").max(200),
  description: z.string().trim().max(4000),
  clinicalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the clinical date.").refine((v) => new Date(v) <= new Date(), "The date can't be in the future."),
  structured: z.string().transform((v, ctx) => { if (!v) return null; try { return JSON.parse(v); } catch { ctx.addIssue({ code: "custom", message: "Invalid structured data." }); return z.NEVER; } }),
  attest: z.string().transform((v) => v === "true"),
  encounterDate: z.string().transform((v) => v || null),
});

export async function POST(req: NextRequest) {
  const stored: StoredFile[] = [];
  try {
    assertSameOrigin(req);
    const actor = await getActor();
    if (!actor || !actor.mfaEnabled || !actor.mfaVerified) throw new AppError(401, "Sign in again.");
    await rateLimit(`submit:${actor.userId}`, 120, 3600);
    const form = await req.formData();
    const p = schema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
    if (!p.success) return NextResponse.json({ ok: false, error: "Check the highlighted fields.", fieldErrors: Object.fromEntries(p.error.issues.map((i) => [i.path.join("."), i.message])) }, { status: 422 });
    const v = p.data;
    if (!actor.affiliations.some((a) => a.institutionId === v.institutionId && a.status === "active")) throw new AppError(403, "You're not an active member of this institution.");
    const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 5);
    for (const f of files) stored.push(await intakeFile(f, "records", v.patientId));
    const [r] = await withActor(actor.userId, (tx) => tx`select app.submit_clinical_record(${v.institutionId}, ${v.patientId}, ${v.category}, ${v.title},
      ${v.description}, ${v.clinicalDate}::date, ${v.structured ? tx.json(v.structured) : null}::jsonb, ${v.attest}, ${v.encounterDate}::date,
      ${tx.json(stored as never)}::jsonb) as id`, { ip: clientIp(req) });
    if (!r.id) throw new AppError(403, "You aren't authorised to submit clinical records for this institution. The attempt was logged.");
    stored.length = 0;
    return NextResponse.json({ ok: true, recordId: r.id });
  } catch (err) {
    await Promise.all(stored.map((s) => discard(s.storage_key)));
    return jsonError(err, "provider.records");
  }
}
