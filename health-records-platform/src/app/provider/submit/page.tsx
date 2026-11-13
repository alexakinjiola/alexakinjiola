import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProviderContext } from "@/lib/auth/provider-context";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PatientSearch } from "../search/search";
import { SubmitForm } from "./form";

export const metadata: Metadata = { title: "Submit a record" };

export default async function SubmitPage({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const { patient } = await searchParams;
  const { actor, current, can } = await requireProviderContext("/provider/submit");
  if (!current || !can("records:submit")) redirect("/provider");
  if (!patient || !/^[0-9a-f-]{36}$/.test(patient)) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Submit a clinical record" description="First, identify the patient." />
        <Card className="max-w-3xl"><CardBody className="sm:p-8"><PatientSearch canSubmit canView={can("records:view_authorized")} /></CardBody></Card>
      </div>
    );
  }
  const [{ p }] = await withActor(actor.userId, (tx) => tx`select app.provider_patient_identity(${current.institutionId}, ${patient}) as p`);
  if (!p) redirect("/provider/submit");
  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <PageHeader title="Submit a clinical record" description={<>For <strong className="text-ink">{p.masked_name}</strong>, born {p.birth_year}, Health ID ending <span className="font-mono">{String(p.health_id_hint).slice(-4)}</span>.</>}
        actions={<Badge tone="success" icon="verified_user">Identity verified</Badge>} />
      <Card><CardBody className="sm:p-8">
        <SubmitForm institutionId={current.institutionId} patientId={patient} needsAttestation={!p.has_relationship && !p.has_permission} professional={actor.professional?.fullName ?? actor.displayName} />
      </CardBody></Card>
    </div>
  );
}
