import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProviderContext } from "@/lib/auth/provider-context";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { BASIS, CATEGORY, PURPOSE } from "@/lib/labels";
import { age, daysUntil, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Authorised patients" };

export default async function PatientsPage() {
  const { actor, current, can } = await requireProviderContext("/provider/patients");
  if (!current || !can("records:view_authorized")) redirect("/provider");
  const rows = await withActor(actor.userId, (tx) => tx`select * from app.provider_authorized_patients(${current.institutionId})`);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Authorised patients" description="Patients whose records you can currently view, and exactly what each permission covers." />
      <Card>
        {rows.length === 0 ? (
          <EmptyState icon="clinical_notes" title="No active permissions" action={<Button asChild variant="secondary" icon="person_search"><Link href="/provider/search">Find a patient</Link></Button>}>
            When a patient approves a request, they appear here until the permission ends or is revoked.
          </EmptyState>
        ) : (
          <Table caption="Patients with active permissions">
            <THead><tr><Th>Patient</Th><Th>Scope</Th><Th>Basis</Th><Th>Ends</Th><Th><span className="sr-only">Open</span></Th></tr></THead>
            <TBody>{rows.map((r) => (
              <Tr key={r.permission_id}>
                <Td><p className="font-semibold text-ink">{r.full_name}</p><p className="text-xs text-ink-3">{age(r.date_of_birth)} yrs · <span className="font-mono">{r.health_id}</span></p></Td>
                <Td className="max-w-72"><p className="text-ink">{PURPOSE[r.purpose]?.label}</p><p className="text-xs text-ink-3">{(r.categories as string[]).map((c) => CATEGORY[c]?.label).join(", ")}</p>
                  {r.restricted && <Badge tone="info" className="mt-1">Named professional only</Badge>}</Td>
                <Td>{r.basis === "emergency_access" ? <Badge tone="danger" icon="emergency">Emergency</Badge> : <span className="text-ink-2">{BASIS[r.basis]}</span>}</Td>
                <Td className="whitespace-nowrap"><span className={daysUntil(r.expires_at) <= 3 ? "font-medium text-warning-fg" : "text-ink-2"}>{formatDateTime(r.expires_at)}</span></Td>
                <Td className="text-right"><Button asChild size="sm"><Link href={`/provider/patients/${r.patient_id}`}>Open</Link></Button></Td>
              </Tr>
            ))}</TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
