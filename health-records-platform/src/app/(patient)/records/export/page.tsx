import type { Metadata } from "next";
import Link from "next/link";
import { hasRecentReauth, requirePatientContext } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { ExportForm } from "./form";

export const metadata: Metadata = { title: "Export my records" };

export default async function ExportPage() {
  const { actor, patientId } = await requirePatientContext("/records/export");
  const rows = await withActor(actor.userId, (tx) => tx`select category_key, count(*)::int n from medical_records
    where patient_id = ${patientId} and status in ('available','under_review','superseded') group by category_key order by category_key`);
  const counts = Object.fromEntries(rows.map((r) => [r.category_key, r.n]));
  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <Link href="/records" className="inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"><Icon name="arrow_back" size={18} />My health records</Link>
      <PageHeader className="mt-4" title="Export my records" description="Download a copy of your health record — as a readable summary or as structured data you can take to another provider." />
      <Card><CardBody className="sm:p-8">
        {rows.length === 0 ? <EmptyState icon="folder_open" title="Nothing to export yet" /> : <ExportForm counts={counts} needsReauth={!hasRecentReauth(actor)} />}
      </CardBody></Card>
    </div>
  );
}
