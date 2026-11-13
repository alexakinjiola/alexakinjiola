import type { Metadata } from "next";
import { requirePatientContext } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { SettingsNav } from "../settings-nav";
import { RepresentationForm } from "./form";

export const metadata: Metadata = { title: "Representatives" };
const REL: Record<string, string> = { parent: "Parent", legal_guardian: "Legal guardian", court_appointed_representative: "Court-appointed representative", power_of_attorney: "Power of attorney" };

export default async function RepresentativesPage() {
  const { actor, patientId } = await requirePatientContext("/settings/representatives");
  const { mine, forMe } = await withActor(actor.userId, async (tx) => ({
    mine: await tx`select pr.id, pr.relationship, pr.status, pr.created_at, pp.full_name from patient_representatives pr
      left join patient_profiles pp on pp.patient_id = pr.patient_id where pr.representative_user_id = ${actor.userId} order by pr.created_at desc`,
    forMe: await tx`select pr.id, pr.relationship, pr.status, pr.created_at, u.display_name from patient_representatives pr
      join users u on u.id = pr.representative_user_id where pr.patient_id = ${patientId}`.catch(() => []),
  }));
  const tone = (s: string) => s === "active" ? "success" : s === "pending_verification" ? "warning" : "neutral";
  return (
    <div className="animate-fade-in">
      <PageHeader title="Profile & settings" />
      <SettingsNav current="representatives" />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader><div><CardTitle>Manage someone else's record</CardTitle>
            <p className="text-sm text-ink-3">For parents of children, legal guardians and people with legal authority to act for someone.</p></div></CardHeader>
          <CardBody><RepresentationForm /></CardBody>
        </Card>
        <aside className="space-y-6">
          <Card><CardHeader><CardTitle>People you represent</CardTitle></CardHeader>
            {mine.length === 0 ? <EmptyState compact icon="group" title="None yet" /> : (
              <ul className="divide-y divide-line">{mine.map((r) => (
                <li key={r.id} className="px-5 py-3 text-sm sm:px-6"><p className="font-medium text-ink">{r.status === "active" ? r.full_name : "Request pending"}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-ink-3">{REL[r.relationship]} <Badge tone={tone(r.status)}>{r.status.replace(/_/g, " ")}</Badge> {formatDate(r.created_at)}</p></li>
              ))}</ul>
            )}
          </Card>
          <Card><CardHeader><CardTitle>Who can act for you</CardTitle></CardHeader>
            {forMe.length === 0 ? <CardBody><p className="text-sm text-ink-3">Nobody else can manage your record.</p></CardBody> : (
              <ul className="divide-y divide-line">{forMe.map((r) => (
                <li key={r.id} className="px-5 py-3 text-sm sm:px-6"><p className="font-medium text-ink">{r.display_name}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-ink-3">{REL[r.relationship]} <Badge tone={tone(r.status)}>{r.status.replace(/_/g, " ")}</Badge></p></li>
              ))}</ul>
            )}
            <CardBody className="border-t border-line text-xs leading-5 text-ink-3">If someone is listed here that you don't recognise, contact support immediately.</CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
