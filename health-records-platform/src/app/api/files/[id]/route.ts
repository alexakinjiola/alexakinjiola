import { type NextRequest } from "next/server";
import { getActor } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { clientIp, jsonError } from "@/lib/route";
import { storage } from "@/lib/storage";

/**
 * The ONLY way to read a stored medical document. The database decides
 * (app.authorize_attachment), logs the access/export, and only then do we
 * fetch and stream the decrypted bytes. Nothing is cacheable.
 *   ?institution=<id>  provider context (permission + scope checks)
 *   ?download=1        attachment disposition
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/.test(id)) throw new AppError(404, "File not found.");
    const actor = await getActor();
    if (!actor || (actor.mfaEnabled && !actor.mfaVerified)) throw new AppError(401, "Sign in to view this file.");
    const inst = req.nextUrl.searchParams.get("institution");
    if (inst && !/^[0-9a-f-]{36}$/.test(inst)) throw new AppError(400, "Invalid request.");

    const [{ r }] = await withActor(actor.userId, (tx) => tx`select app.authorize_attachment(${id}, ${inst}::uuid) as r`, { ip: clientIp(req) });
    if (!r.allowed) throw new AppError(r.reason === "not_found" ? 404 : 403, r.reason === "not_found" ? "File not found." : "You don't have permission to open this file.");

    const bytes = await storage().get(r.storage_key);
    const disposition = req.nextUrl.searchParams.get("download") ? "attachment" : "inline";
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": r.mime_type,
        "Content-Length": String(bytes.length),
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(r.file_name)}`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch (err) {
    return jsonError(err, "files.get");
  }
}
