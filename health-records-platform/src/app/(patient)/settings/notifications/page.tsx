import type { Metadata } from "next";
import { requirePatientContext } from "@/lib/auth/actor";
import { notificationPrefs } from "@/server/patient";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsNav } from "../settings-nav";
import { Prefs } from "./prefs";

export const metadata: Metadata = { title: "Notification preferences" };

export default async function NotificationPrefsPage() {
  const { actor } = await requirePatientContext("/settings/notifications");
  const rows = await notificationPrefs(actor.userId);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Profile & settings" />
      <SettingsNav current="notifications" />
      <Card className="max-w-3xl">
        <CardHeader><div><CardTitle>Notifications</CardTitle><p className="text-sm text-ink-3">Emails never contain health information — they ask you to sign in.</p></div></CardHeader>
        <CardBody><Prefs initial={Object.fromEntries(rows.map((r) => [r.type, { in_app: r.in_app, email: r.email }]))} /></CardBody>
      </Card>
    </div>
  );
}
