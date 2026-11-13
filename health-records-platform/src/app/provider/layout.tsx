import { AppShell } from "@/components/shell/app-shell";
import { UserMenu } from "@/components/shell/user-menu";
import { NotificationBell } from "@/components/shell/notification-bell";
import type { NavItem } from "@/components/shell/nav";
import { requireProviderContext } from "@/lib/auth/provider-context";
import { withActor } from "@/lib/db";
import { INSTITUTION_STATUS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { signOutAction } from "../(auth)/actions";
import { InstitutionSwitcher } from "./institution-switcher";

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const { actor, current, affiliations, can } = await requireProviderContext();
  const [c] = await withActor(actor.userId, (tx) => tx`
    select (select count(*)::int from notifications where user_id = ${actor.userId} and read_at is null) as unread,
           (select count(*)::int from access_requests where institution_id = ${current?.institutionId ?? null}::uuid and status = 'pending' and respond_by > now()) as pending`);

  const nav: NavItem[] = [{ href: "/provider", label: "Overview", icon: "dashboard", exact: true }];
  if (can("access:request")) nav.push({ href: "/provider/search", label: "Patient search", icon: "person_search" }, { href: "/provider/requests", label: "Access requests", icon: "pending_actions", badge: c.pending });
  if (can("records:view_authorized")) nav.push({ href: "/provider/patients", label: "Authorised patients", icon: "clinical_notes" });
  if (can("records:submit")) nav.push({ href: "/provider/submit", label: "Submit a record", icon: "upload_file" }, { href: "/provider/submissions", label: "Record submissions", icon: "receipt_long" });
  if (can("staff:manage")) nav.push({ href: "/provider/staff", label: "Staff management", icon: "group" });
  if (current && current.capabilities.includes("institution:manage") || actor.ownedInstitutionDrafts.length) nav.push({ href: "/provider/institution", label: "Institution settings", icon: "domain" });
  if (can("activity:view")) nav.push({ href: "/provider/activity", label: "Activity logs", icon: "policy" });
  nav.push({ href: "/provider/notifications", label: "Notifications", icon: "notifications", badge: c.unread }, { href: "/provider/account", label: "My account", icon: "manage_accounts" });

  const status = current ? INSTITUTION_STATUS[current.institutionStatus] : null;
  const instBlock = current ? (
    <div className="rounded-md bg-white/[0.05] p-3 ring-1 ring-white/10">
      <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-navy-300">Working for</p>
      {affiliations.length > 1
        ? <InstitutionSwitcher current={current.institutionId} options={affiliations.map((a) => ({ id: a.institutionId, name: a.institutionName }))} />
        : <p className="mt-1 text-sm font-semibold text-white">{current.institutionName}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {status && <Badge tone={status.tone} className="!h-5 !text-[11px]">{status.label}</Badge>}
        <span className="text-xs text-navy-200">{current.roleName}</span>
      </div>
    </div>
  ) : null;

  return (
    <AppShell
      variant="provider" nav={nav} logoSuffix="Provider" synthetic={actor.isSynthetic} sidebarTop={instBlock}
      sidebarFooter={<p className="px-2 text-xs leading-5 text-navy-300">Every record you open is logged and visible to the patient.</p>}
      topRight={<>
        <NotificationBell count={c.unread} href="/provider/notifications" />
        <UserMenu name={actor.professional?.fullName ?? actor.displayName} email={actor.email} signOut={signOutAction}
          links={[{ href: "/provider/account", label: "My account & security", icon: "manage_accounts" },
            ...(actor.patient ? [{ href: "/dashboard", label: "My personal health record", icon: "person" as const }] : []),
            ...(actor.platformRoles.length ? [{ href: "/admin", label: "Administration", icon: "admin_panel_settings" as const }] : [])]} />
      </>}
    >
      {children}
    </AppShell>
  );
}
