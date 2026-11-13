import { AppShell } from "@/components/shell/app-shell";
import { UserMenu } from "@/components/shell/user-menu";
import { NotificationBell } from "@/components/shell/notification-bell";
import type { NavItem } from "@/components/shell/nav";
import { requirePlatformRole } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { Icon } from "@/components/ui/icon";
import { signOutAction } from "../(auth)/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requirePlatformRole();
  const has = (r: string) => actor.platformRoles.includes(r);
  const [c] = await withActor(actor.userId, (tx) => tx`select
    (select count(*)::int from notifications where user_id = ${actor.userId} and read_at is null) as unread,
    (select count(*)::int from healthcare_institutions where status in ('submitted','under_review')) as inst,
    (select count(*)::int from security_incidents where status in ('open','investigating')) as inc,
    (select count(*)::int from support_tickets where status in ('open','in_progress')) as tickets`);
  const nav: NavItem[] = [{ href: "/admin", label: "Overview", icon: "dashboard", exact: true }];
  if (has("platform_admin")) nav.push({ href: "/admin/institutions", label: "Institutions", icon: "domain", badge: c.inst }, { href: "/admin/professionals", label: "Professional verification", icon: "badge" });
  if (has("platform_admin") || has("support_agent")) nav.push({ href: "/admin/patients", label: "Patient accounts", icon: "manage_accounts" });
  if (has("security_officer")) nav.push({ href: "/admin/security", label: "Security & incidents", icon: "security", badge: c.inc });
  if (has("security_officer") || has("platform_admin")) nav.push({ href: "/admin/audit", label: "Audit logs", icon: "fact_check" });
  if (has("support_agent") || has("platform_admin")) nav.push({ href: "/admin/support", label: "Support", icon: "support_agent", badge: c.tickets });
  if (has("platform_admin")) nav.push({ href: "/admin/settings", label: "System settings", icon: "settings" });
  return (
    <AppShell variant="admin" nav={nav} logoSuffix="Admin" synthetic={actor.isSynthetic}
      sidebarFooter={<div className="rounded-md border border-danger-fg/40 bg-danger-fg/10 p-3 text-xs leading-5 text-navy-200">
        <p className="flex items-center gap-1.5 font-semibold text-white"><Icon name="policy" size={16} />Restricted console</p>
        Every action is audited. Clinical records are not accessible from here.</div>}
      topRight={<>
        <NotificationBell count={c.unread} href="/admin" />
        <UserMenu name={actor.displayName} email={actor.email} signOut={signOutAction}
          links={[{ href: "/admin/account", label: "My account & security", icon: "manage_accounts" }]} />
      </>}>
      {children}
    </AppShell>
  );
}
