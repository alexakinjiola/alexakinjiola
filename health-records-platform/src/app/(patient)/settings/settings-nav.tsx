import { TabsNav } from "@/components/ui/tabs-nav";

export function SettingsNav({ current }: { current: string }) {
  return (
    <div className="mb-6">
      <TabsNav label="Settings sections" current={current} tabs={[
        { key: "profile", label: "Profile", href: "/settings" },
        { key: "identity", label: "Identity", href: "/settings/identity" },
        { key: "security", label: "Security", href: "/settings/security" },
        { key: "notifications", label: "Notifications", href: "/settings/notifications" },
        { key: "representatives", label: "Representatives", href: "/settings/representatives" },
        { key: "privacy", label: "Privacy & data", href: "/settings/privacy" },
      ]} />
    </div>
  );
}
