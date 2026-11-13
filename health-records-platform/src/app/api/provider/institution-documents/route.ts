import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getActor } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { assertSameOrigin, clientIp, jsonError } from "@/lib/route";
import { rateLimit } from "@/lib/rate-limit";
import { discard, intakeFile } from "@/lib/files/intake";

export async function POST(req: NextRequest) {
  let key: string | null = null;
  try {
    assertSameOrigin(req);
    const actor = await getActor();
    if (!actor || (actor.mfaEnabled && !actor.mfaVerified)) throw new AppError(401, "Sign in again.");
    await rateLimit(`inst-doc:${actor.userId}`, 20, 3600);
    const form = await req.formData();
    const institutionId = z.string().uuid().parse(form.get("institutionId"));
    const docType = z.enum(["operating_license", "cac_certificate", "representative_id", "accreditation", "other"]).parse(form.get("documentType"));
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError(400, "Choose a file.");
    const s = await intakeFile(file, "institutions", institutionId);
    key = s.storage_key;
    await withActor(actor.userId, (tx) => tx`select app.add_institution_document(${institutionId}, ${docType}, ${s.storage_key}, ${s.file_name},
      ${s.mime_type}, ${s.size_bytes}, ${s.sha256})`, { ip: clientIp(req) });
    key = null;
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (key) await discard(key);
    return jsonError(err, "institution.documents");
  }
}
