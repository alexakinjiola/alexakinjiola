import type { Metadata } from "next";
import Link from "next/link";
import { requirePatientContext } from "@/lib/auth/actor";
import { notifications } from "@/server/patient";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotificationList } from "@/components/domain/notification-list";
import { markNotificationsReadAction } from "../actions";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const { actor } = await requirePatientContext("/notifications");
  const items = await notifications(actor.userId);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Notifications" description="Requests, new records, sharing and security alerts."
        actions={<Button asChild variant="secondary" icon="tune"><Link href="/settings/notifications">Preferences</Link></Button>} />
      <Card><NotificationList items={items as never} markRead={markNotificationsReadAction} /></Card>
    </div>
  );
}
