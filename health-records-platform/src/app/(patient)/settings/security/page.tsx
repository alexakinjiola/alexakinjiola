import type { Metadata } from "next";
import { requirePatientContext } from "@/lib/auth/actor";
import { PageHeader } from "@/components/ui/page-header";
import { SecuritySettings } from "@/components/domain/security-settings";
import { SettingsNav } from "../settings-nav";

export const metadata: Metadata = { title: "Security" };

export default async function SecurityPage() {
  const { actor } = await requirePatientContext("/settings/security");
  return (
    <div className="animate-fade-in">
      <PageHeader title="Profile & settings" />
      <SettingsNav current="security" />
      <div className="max-w-3xl"><SecuritySettings actor={actor} /></div>
    </div>
  );
}
