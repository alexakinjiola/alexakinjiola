import type { Metadata } from "next";
import { requirePlatformRole } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterField, filterControl } from "@/components/ui/filter-bar";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { VERIFICATION } from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/format";
import { AdminAction } from "../confirm";
import { decideIdentityAction, setRepresentativeAction, setUserStatusAction } from "../actions";

export const metadata: Metadata = { title: "Patient accounts" };

export default async function PatientsAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const actor = await requirePlatformRole(["platform_admin", "support_agent"]);
  const { q } = await searchParams;
  const isAdmin = actor.platformRoles.includes("platform_admin");
  const d = await withActor(actor.userId, async (tx) => ({
    patients: await tx`select * from app.admin_list_patients(${q?.trim() || null}, 50, 0)`,
    queue: await tx`select * from app.admin_identity_queue()`,
    reps: isAdmin ? await tx`select * from app.admin_representative_queue()` : [],
  }));
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Patient accounts" description="Account status, identity verification and reconciliation. Clinical records are not visible here." />
      <Callout tone="info" icon="policy">You're seeing support metadata only: name, contact, identifiers and status. Every action below is audited.</Callout>
      <Card>
        <CardHeader><CardTitle>Identity verification queue ({d.queue.length})</CardTitle></CardHeader>
        {d.queue.length === 0 ? <EmptyState compact icon="how_to_reg" title="No checks waiting" /> : (
          <Table caption="Identity verification queue">
            <THead><tr><Th>Patient</Th><Th>Method</Th><Th>Signals</Th><Th>Submitted</Th><Th><span className="sr-only">Decide</span></Th></tr></THead>
            <TBody>{d.queue.map((v) => (
              <Tr key={v.id}>
                <Td><p className="font-medium text-ink">{v.full_name}</p><p className="text-xs text-ink-3">Born {formatDate(v.date_of_birth)} · {v.email}</p></Td>
                <Td className="text-ink-2">{v.method === "nin" ? `NIN ••••${v.nin_hint ?? ""}` : "In person"}<p className="text-xs text-ink-3">{v.provider}</p></Td>
                <Td>{Number(v.possible_duplicates) > 0 && <Badge tone="warning">{v.possible_duplicates} similar account(s)</Badge>}{v.failure_reason && <p className="mt-1 text-xs text-ink-3">{v.failure_reason}</p>}</Td>
                <Td className="text-ink-3">{formatDateTime(v.submitted_at)}</Td>
                <Td className="whitespace-nowrap text-right space-x-2">
                  <AdminAction label="Fail" variant="danger-outline" tone="danger" title="Mark verification as failed" description="The patient is told and offered help." action={decideIdentityAction.bind(null, v.id, "failed")} />
                  <AdminAction label="Verify" title={`Verify ${v.full_name}`} description="Confirm you've matched the identity evidence. Never merge duplicate accounts automatically." reasonLabel="Evidence checked" action={decideIdentityAction.bind(null, v.id, "verified")} />
                </Td>
              </Tr>
            ))}</TBody>
          </Table>
        )}
      </Card>
      {isAdmin && d.reps.length > 0 && (
        <Card><CardHeader><CardTitle>Representatives (parents, guardians, legal representatives)</CardTitle></CardHeader>
          <Table caption="Representative requests">
            <THead><tr><Th>Patient</Th><Th>Representative</Th><Th>Relationship</Th><Th>Status</Th><Th><span className="sr-only">Decide</span></Th></tr></THead>
            <TBody>{d.reps.map((r) => (
              <Tr key={r.id}>
                <Td><p className="text-ink">{r.patient_name}</p><p className="text-xs text-ink-3">Born {formatDate(r.patient_dob)}</p></Td>
                <Td><p className="text-ink">{r.representative_name}</p><p className="text-xs text-ink-3">{r.representative_email}</p></Td>
                <Td className="text-ink-2">{r.relationship.replace(/_/g, " ")}</Td>
                <Td><Badge tone={r.status === "active" ? "success" : r.status === "pending_verification" ? "warning" : "neutral"}>{r.status.replace(/_/g, " ")}</Badge></Td>
                <Td className="whitespace-nowrap text-right space-x-2">
                  {r.status === "pending_verification" && <AdminAction label="Activate" title="Activate representative" description="Only after verifying legal documentation (birth certificate, court order, power of attorney). Legal requirements need counsel confirmation." reasonLabel="Documents verified" action={setRepresentativeAction.bind(null, r.id, "active")} />}
                  {r.status !== "revoked" && <AdminAction label="Revoke" variant="danger-outline" tone="danger" title="Revoke representative" action={setRepresentativeAction.bind(null, r.id, "revoked")} />}
                </Td>
              </Tr>
            ))}</TBody>
          </Table></Card>
      )}
      <FilterBar resetHref="/admin/patients" label="Search patients">
        <FilterField label="Name, email or Health ID" className="lg:col-span-3"><input name="q" defaultValue={q} className={filterControl} /></FilterField>
      </FilterBar>
      <Card>
        {d.patients.length === 0 ? <EmptyState compact icon="person_search" title="No patients found" /> : (
          <Table caption="Patient accounts">
            <THead><tr><Th>Patient</Th><Th>Health ID</Th><Th>Identity</Th><Th>Account</Th><Th>Last sign-in</Th><Th><span className="sr-only">Actions</span></Th></tr></THead>
            <TBody>{d.patients.map((p) => (
              <Tr key={p.patient_id}>
                <Td><p className="font-medium text-ink">{p.full_name}{p.is_synthetic && <span className="text-xs text-ink-3"> · synthetic</span>}</p><p className="text-xs text-ink-3">{p.email} · {p.phone}</p></Td>
                <Td className="font-mono text-xs text-ink-2">{p.health_id}</Td>
                <Td><Badge tone={VERIFICATION[p.verification_status]?.tone}>{VERIFICATION[p.verification_status]?.label}</Badge></Td>
                <Td><Badge tone={p.account_status === "active" ? "success" : "danger"}>{p.account_status}</Badge></Td>
                <Td className="text-ink-3">{p.last_login_at ? formatDateTime(p.last_login_at) : "Never"}</Td>
                <Td className="text-right">{p.user_id && (p.account_status === "active"
                  ? <AdminAction label="Suspend" variant="ghost" tone="danger" title={`Suspend ${p.full_name}'s account`} description="Signs them out everywhere. Use for suspected compromise or a verified request." action={setUserStatusAction.bind(null, p.user_id, "suspended")} />
                  : <AdminAction label="Reactivate" variant="secondary" title="Reactivate account" description="Also clears any login lockout." action={setUserStatusAction.bind(null, p.user_id, "active")} />)}</Td>
              </Tr>
            ))}</TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
