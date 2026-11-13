import type { Metadata } from "next";
import { requirePlatformRole } from "@/lib/auth/actor";
import { PageHeader } from "@/components/ui/page-header";
import { SecuritySettings } from "@/components/domain/security-settings";

export const metadata: Metadata = { title: "My account" };

export default async function AdminAccount() {
  const actor = await requirePlatformRole();
  return <div className="max-w-3xl animate-fade-in"><PageHeader title="My account & security" description={`Roles: ${actor.platformRoles.join(", ")}`} /><SecuritySettings actor={actor} /></div>;
}
