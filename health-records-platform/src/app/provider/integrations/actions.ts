"use server";
import { z } from "zod";
import { handle, parse } from "@/lib/action";
import { withActor } from "@/lib/db";
import { randomToken, sha256Hex } from "@/lib/crypto";
import { requestMeta } from "@/lib/request";
import { requireProviderContext } from "@/lib/auth/provider-context";
import { AppError } from "@/lib/errors";

export async function createIntegrationAction(input: unknown) {
  return handle("create_integration", async () => {
    const v = parse(z.object({
      name: z.string().trim().min(3, "Name the connected system.").max(120),
      systemType: z.enum(["hms", "emr", "lims", "ris_pacs", "other"]),
    }), input);
    const { actor, current } = await requireProviderContext();
    if (!current) throw new AppError(403, "Not an institution member.");
    const key = `cnt_live_${randomToken(30)}`;
    await withActor(actor.userId, (tx) => tx`select app.create_integration(${current.institutionId}, ${v.name}, ${v.systemType}, 'fhir_r4',
      ${key.slice(0, 16)}, ${sha256Hex(key)})`, await requestMeta());
    // Returned exactly once; only the hash is stored.
    return { key };
  });
}

export async function setIntegrationStatusAction(id: string, status: "paused" | "revoked" | "active", _input?: { reason: string; credential: string }) {
  return handle("integration_status", async () => {
    const { actor } = await requireProviderContext();
    await withActor(actor.userId, (tx) => tx`select app.set_integration_status(${z.string().uuid().parse(id)}, ${status})`, await requestMeta());
  }, "Connection updated.");
}

export async function rotateIntegrationKeyAction(id: string) {
  return handle("rotate_integration", async () => {
    const { actor } = await requireProviderContext();
    const key = `cnt_live_${randomToken(30)}`;
    const [r] = await withActor(actor.userId, (tx) => tx`select app.rotate_integration_key(${z.string().uuid().parse(id)}, ${key.slice(0, 16)}, ${sha256Hex(key)}) as grace`, await requestMeta());
    return { key, previousValidUntil: r.grace as string | null };
  });
}
