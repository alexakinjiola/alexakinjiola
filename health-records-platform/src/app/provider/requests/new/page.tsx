import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProviderContext } from "@/lib/auth/provider-context";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";
import { RequestForm } from "./form";

export const metadata: Metadata = { title: "Request access" };

export default async function NewRequest({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const { patient } = await searchParams;
  const { actor, current, can } = await requireProviderContext("/provider/requests/new");
  if (!can("access:request") || !current) redirect("/provider");
  if (!patient || !/^[0-9a-f-]{36}$/.test(patient)) redirect("/provider/search");
  const [{ p }] = await withActor(actor.userId, (tx) => tx`select app.provider_patient_identity(${current.institutionId}, ${patient}) as p`);
  const [{ max }] = await withActor(actor.userId, (tx) => tx`select app.setting_int('access.max_permission_days', 180) as max`);
  if (!p) redirect("/provider/search");
  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <PageHeader title="Request access to records" description={`For ${p.masked_name}, born ${p.birth_year} (Health ID ending ${String(p.health_id_hint).slice(-4)}).`} />
      {p.pending_request ? (
        <Callout tone="warning" title="A request is already waiting" action={<Button asChild size="sm" variant="secondary"><Link href="/provider/requests">View requests</Link></Button>}>
          Your institution already has a pending request for this patient. Ask them to review it in their app.
        </Callout>
      ) : (
        <Card><CardBody className="sm:p-8">
          <Callout tone="info" className="mb-7">The patient is notified immediately. Nothing is shared until they approve, and unanswered requests expire automatically.</Callout>
          <RequestForm patientId={patient} maxDays={max} />
        </CardBody></Card>
      )}
    </div>
  );
}
