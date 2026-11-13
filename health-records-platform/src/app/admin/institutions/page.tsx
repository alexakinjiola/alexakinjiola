import type { Metadata } from "next";
import Link from "next/link";
import { requirePlatformRole } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { TabsNav } from "@/components/ui/tabs-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { INSTITUTION_STATUS, INSTITUTION_TYPE } from "@/lib/labels";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Institutions" };
const TABS = ["queue", "approved", "suspended", "rejected", "all"];

export default async function InstitutionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const actor = await requirePlatformRole(["platform_admin"]);
  const sp = await searchParams;
  const tab = TABS.includes(sp.status ?? "") ? sp.status! : sp.status === "submitted" ? "queue" : "queue";
  const rows = await withActor(actor.userId, (tx) => tx`
    select i.id, i.name, i.institution_type, i.city, i.state, i.status, i.submitted_at, i.created_at, i.is_synthetic,
      (select count(*)::int from institution_documents d where d.institution_id = i.id) as docs,
      (select count(*)::int from professional_affiliations a where a.institution_id = i.id and a.status = 'active') as staff
    from healthcare_institutions i
    where i.status <> 'draft' and (${tab} = 'all' or (${tab} = 'queue' and i.status in ('submitted','under_review')) or i.status::text = ${tab})
    order by i.submitted_at asc nulls last`);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Healthcare institutions" description="Review applications against licensing evidence. Only approved institutions can use provider functions." />
      <TabsNav label="Institution status" current={tab} tabs={[{ key: "queue", label: "Review queue", href: "/admin/institutions" },
        ...TABS.slice(1).map((t) => ({ key: t, label: t === "all" ? "All" : INSTITUTION_STATUS[t].label, href: `/admin/institutions?status=${t}` }))]} />
      <Card className="mt-5">
        {rows.length === 0 ? <EmptyState icon="domain" title="Nothing here" /> : (
          <Table caption="Institutions">
            <THead><tr><Th>Institution</Th><Th>Location</Th><Th>Status</Th><Th>Submitted</Th><Th>Evidence</Th><Th><span className="sr-only">Review</span></Th></tr></THead>
            <TBody>{rows.map((i) => (
              <Tr key={i.id}>
                <Td><p className="font-medium text-ink">{i.name}</p><p className="text-xs text-ink-3">{INSTITUTION_TYPE[i.institution_type]}{i.is_synthetic && " · synthetic"}</p></Td>
                <Td className="text-ink-2">{i.city}, {i.state}</Td>
                <Td><Badge tone={INSTITUTION_STATUS[i.status]?.tone}>{INSTITUTION_STATUS[i.status]?.label}</Badge></Td>
                <Td className="text-ink-3">{formatDate(i.submitted_at)}</Td>
                <Td className="text-ink-3">{i.docs} docs · {i.staff} staff</Td>
                <Td className="text-right"><Button asChild size="sm" variant="secondary"><Link href={`/admin/institutions/${i.id}`}>Review</Link></Button></Td>
              </Tr>
            ))}</TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
