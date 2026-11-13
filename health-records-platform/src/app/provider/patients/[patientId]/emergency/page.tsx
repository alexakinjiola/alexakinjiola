import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireProviderContext } from "@/lib/auth/provider-context";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { EmergencyForm } from "./form";

export const metadata: Metadata = { title: "Emergency access" };

export default async function EmergencyPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(patientId)) notFound();
  const { actor, current, can } = await requireProviderContext();
  if (!current || !can("emergency:access")) redirect("/provider");
  const [s] = await withActor(actor.userId, (tx) => tx`select app.setting('emergency.allowed_categories') as cats, app.setting_int('emergency.max_hours', 12) as hours,
    app.provider_patient_identity(${current.institutionId}, ${patientId}) as p`);
  if (!s.p) notFound();
  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <PageHeader eyebrow="Break-glass" title="Emergency access" description={`For ${s.p.masked_name}, born ${s.p.birth_year}.`} />
      <Callout tone="danger" className="mb-6" title="Use only when the patient can't be asked">
        Emergency access isn't a shortcut for routine care or an unanswered request. It's limited to minimum-necessary categories for {s.hours} hours,
        the patient is notified immediately, and the platform security team reviews every use.
      </Callout>
      <Card><CardBody className="sm:p-8"><EmergencyForm patientId={patientId} allowed={s.cats as string[]} hours={s.hours} /></CardBody></Card>
    </div>
  );
}
