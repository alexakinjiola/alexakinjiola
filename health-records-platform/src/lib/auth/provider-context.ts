import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireActor, type Affiliation } from "./actor";

export const INSTITUTION_COOKIE = "continuum_institution";

/**
 * Which institution the professional is working for right now. The cookie is
 * only a preference: it must match one of the actor's live affiliations, and
 * every database function re-checks the affiliation independently.
 */
export async function requireProviderContext(next = "/provider") {
  const actor = await requireActor({ next });
  const active = actor.affiliations.filter((a) => a.status === "active");
  const jar = await cookies();
  const pref = jar.get(INSTITUTION_COOKIE)?.value;
  const current: Affiliation | null = active.find((a) => a.institutionId === pref) ?? active[0] ?? null;
  return { actor, current, affiliations: active, can: (cap: string) => !!current && current.institutionStatus === "approved" && current.capabilities.includes(cap) };
}

/** For pages that only make sense with an approved institution and a capability. */
export async function requireCapability(cap: string, next: string) {
  const ctx = await requireProviderContext(next);
  if (!ctx.current) redirect("/provider");
  return ctx;
}
