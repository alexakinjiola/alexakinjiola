import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProviderContext } from "@/lib/auth/provider-context";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { PRO_STATUS, PROFESSION } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { setStaffStatusAction } from "../actions";
import { InviteDialog } from "./invite";

export const metadata: Metadata = { title: "Staff management" };
const AFF: Record<string, "success" | "warning" | "neutral" | "danger"> = { active: "success", suspended: "warning", ended: "neutral", revoked: "danger" };

export default async function StaffPage() {
  const { actor, current, can } = await requireProviderContext("/provider/staff");
  if (!current || !can("staff:manage")) redirect("/provider");
  const { staff, invites } = await withActor(actor.userId, async (tx) => ({
    staff: await tx`select * from app.institution_staff(${current.institutionId})`,
    invites: await tx`select i.id, i.email, i.full_name, i.status, i.expires_at, r.name as role from staff_invitations i join roles r on r.id = i.role_id
      where i.institution_id = ${current.institutionId} and i.status = 'pending' and i.expires_at > now() order by i.created_at desc`,
  }));
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Staff management" description="Invite professionals, assign roles and remove access the moment someone leaves." actions={<InviteDialog />} />
      {invites.length > 0 && (
        <Card><CardHeader><CardTitle>Pending invitations</CardTitle></CardHeader>
          <ul className="divide-y divide-line">{invites.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm sm:px-6"><span className="flex-1"><span className="font-medium text-ink">{i.full_name}</span> <span className="text-ink-3">· {i.email}</span></span>
              <Badge tone="info">{i.role}</Badge><span className="text-xs text-ink-3">Expires {formatDate(i.expires_at)}</span></li>
          ))}</ul></Card>
      )}
      <Card>
        {staff.length === 0 ? <EmptyState icon="group" title="No staff yet" /> : (
          <Table caption="Institution staff">
            <THead><tr><Th>Name</Th><Th>Role</Th><Th>Licence</Th><Th>Access</Th><Th><span className="sr-only">Actions</span></Th></tr></THead>
            <TBody>{staff.map((s) => (
              <Tr key={s.affiliation_id}>
                <Td><p className="font-medium text-ink">{s.full_name}{s.is_me && <span className="text-ink-3"> (you)</span>}</p><p className="text-xs text-ink-3">{s.email} · {PROFESSION[s.profession]}</p></Td>
                <Td className="text-ink-2">{s.role_name}</Td>
                <Td><Badge tone={PRO_STATUS[s.verification]?.tone}>{PRO_STATUS[s.verification]?.label}</Badge>{s.license_number && <p className="mt-1 font-mono text-xs text-ink-3">{s.license_body} {s.license_number}</p>}</Td>
                <Td><Badge tone={AFF[s.status]}>{s.status}</Badge><p className="mt-1 text-xs text-ink-3">since {formatDate(s.started_at)}</p></Td>
                <Td className="text-right whitespace-nowrap">
                  {!s.is_me && s.status === "active" && <>
                    <ConfirmDialog trigger={<Button size="sm" variant="ghost">Suspend</Button>} title={`Suspend ${s.full_name}?`} confirmLabel="Suspend"
                      description="They lose access immediately and can be reinstated later." reason={{ label: "Reason", required: true, minLength: 5 }}
                      onConfirm={(i) => setStaffStatusAction(s.affiliation_id, "suspended", i)} />
                    <ConfirmDialog trigger={<Button size="sm" variant="ghost" className="text-danger-fg">Remove</Button>} title={`Remove ${s.full_name}?`} tone="danger" confirmLabel="Remove access"
                      description="Use this when someone leaves. Their access ends now, and permissions patients granted to them personally are revoked." reason={{ label: "Reason", required: true, minLength: 5 }}
                      onConfirm={(i) => setStaffStatusAction(s.affiliation_id, "ended", i)} />
                  </>}
                  {!s.is_me && s.status === "suspended" && (
                    <ConfirmDialog trigger={<Button size="sm" variant="secondary">Reinstate</Button>} title={`Reinstate ${s.full_name}?`} confirmLabel="Reinstate"
                      reason={{ label: "Reason" }} onConfirm={(i) => setStaffStatusAction(s.affiliation_id, "active", i)} />
                  )}
                </Td>
              </Tr>
            ))}</TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
