import { type NextRequest } from "next/server";
import { getActor } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { jsonError } from "@/lib/route";
import { storage } from "@/lib/storage";

/** Institution verification documents — institutional, not patient, data. RLS limits who can resolve the key. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/.test(id)) throw new AppError(404, "Not found.");
    const actor = await getActor();
    if (!actor || !actor.mfaVerified) throw new AppError(401, "Sign in.");
    const [doc] = await withActor(actor.userId, (tx) => tx`select storage_key, file_name, mime_type, institution_id from institution_documents where id = ${id}`);
    if (!doc) throw new AppError(404, "Not found.");
    await withActor(actor.userId, (tx) => tx`select app.log_institution_document_view(${id})`);
    const bytes = await storage().get(doc.storage_key);
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": doc.mime_type, "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.file_name)}`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
    } });
  } catch (err) {
    return jsonError(err, "admin.institution_document");
  }
}
