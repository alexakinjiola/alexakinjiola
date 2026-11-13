import type { Metadata } from "next";
import { requireProviderContext } from "@/lib/auth/provider-context";
import { notifications } from "@/server/patient";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { NotificationList } from "@/components/domain/notification-list";
import { markNotificationsReadAction } from "../../(patient)/actions";

export const metadata: Metadata = { title: "Notifications" };

export default async function ProviderNotifications() {
  const { actor } = await requireProviderContext("/provider/notifications");
  const items = await notifications(actor.userId);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Notifications" description="Request decisions, revocations, expiring access, verification and staff updates." />
      <Card><NotificationList items={items as never} markRead={markNotificationsReadAction} /></Card>
    </div>
  );
}
