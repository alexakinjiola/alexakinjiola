import type { Metadata } from "next";
import { requirePlatformRole } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { FilterBar, FilterField, filterControl } from "@/components/ui/filter-bar";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/format";
import { VerifyChain } from "./verify";

export const metadata: Metadata = { title: "Audit logs" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string; scope?: string }> }) {
  const actor = await requirePlatformRole(["security_officer", "platform_admin"]);
  const sp = await searchParams;
  const action = sp.action?.trim() || null;
  const adminOnly = sp.scope === "admin";
  const rows = await withActor(actor.userId, (tx) => tx`
    select a.chain_seq, a.occurred_at, a.actor_type, a.action, a.entity_type, a.entity_id, a.metadata, a.ip_address::text as ip, a.hash, a.actor_user_id
    from audit_logs a where (${action}::text is null or a.action ilike ${action} || '%') and (${!adminOnly} or a.action like 'admin.%')
    order by a.chain_seq desc limit 300`);
  const ids = [...new Set(rows.map((r) => r.actor_user_id).filter(Boolean))];
  const users = ids.length ? await withActor(actor.userId, (tx) => tx`select * from app.admin_users_brief(${ids}::uuid[])`) : [];
  const name = Object.fromEntries(users.map((u) => [u.id, u.display_name]));
  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title="Audit logs" description="Append-only, hash-chained record of security, administrative and workflow events. Metadata contains no clinical content." actions={<VerifyChain />} />
      <FilterBar resetHref="/admin/audit" label="Filter audit log">
        <FilterField label="Action starts with"><input name="action" defaultValue={action ?? ""} placeholder="e.g. permission." className={filterControl} /></FilterField>
        <FilterField label="Scope"><select name="scope" defaultValue={sp.scope ?? ""} className={filterControl}><option value="">All events</option><option value="admin">Administrative actions only</option></select></FilterField>
      </FilterBar>
      <Card>{rows.length === 0 ? <EmptyState icon="fact_check" title="No entries" /> : (
        <Table caption="Audit log entries">
          <THead><tr><Th>#</Th><Th>When</Th><Th>Actor</Th><Th>Action</Th><Th>Entity</Th><Th>Details</Th><Th>Hash</Th></tr></THead>
          <TBody>{rows.map((r) => (
            <Tr key={r.chain_seq}>
              <Td className="tabular text-ink-3">{r.chain_seq}</Td>
              <Td className="whitespace-nowrap text-ink-3">{formatDateTime(r.occurred_at)}</Td>
              <Td className="text-ink">{r.actor_user_id ? name[r.actor_user_id] ?? "User" : "System"}{r.ip && <p className="font-mono text-xs text-ink-3">{r.ip}</p>}</Td>
              <Td className="font-mono text-xs text-ink">{r.action}</Td>
              <Td className="text-xs text-ink-3">{r.entity_type}<br /><span className="font-mono">{String(r.entity_id ?? "").slice(0, 12)}</span></Td>
              <Td className="max-w-72 font-mono text-[11px] leading-4 text-ink-3 break-all">{JSON.stringify(r.metadata)}</Td>
              <Td className="font-mono text-[11px] text-ink-3">{r.hash.slice(0, 10)}…</Td>
            </Tr>
          ))}</TBody>
        </Table>
      )}</Card>
    </div>
  );
}
