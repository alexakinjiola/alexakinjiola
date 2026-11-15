import type { Metadata } from "next";
import Link from "next/link";
import { requirePatientContext } from "@/lib/auth/actor";
import { profile } from "@/server/patient";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DescriptionList } from "@/components/ui/description-list";
import { HealthIdChip } from "@/components/domain/health-id";
import { VERIFICATION } from "@/lib/labels";
import { formatDate, age } from "@/lib/format";
import { SettingsNav } from "./settings-nav";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile & settings" };

const SEX: Record<string, string> = { female: "Female", male: "Male", intersex: "Intersex", undisclosed: "Prefer not to say" };

export default async function SettingsPage() {
  const { actor, patientId } = await requirePatientContext("/settings");
  const { p, reps } = await profile(actor.userId, patientId);
  const v = VERIFICATION[p.verification_status];
  return (
    <div className="animate-fade-in">
      <PageHeader title="Profile & settings" />
      <SettingsNav current="profile" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div><CardTitle>Personal details</CardTitle><p className="text-sm text-ink-3">These identify you to healthcare institutions, so they can only be changed after a check.</p></div>
              <Button asChild variant="secondary" size="sm" icon="edit_note"><Link href="/support?category=profile_correction">Request a correction</Link></Button>
            </CardHeader>
            <CardBody>
              <DescriptionList items={[
                { label: "Full name", value: p.full_name },
                { label: "Date of birth", value: `${formatDate(p.date_of_birth)} (age ${age(p.date_of_birth)})` },
                { label: "Sex", value: SEX[p.sex] },
                { label: "Email", value: actor.email },
                { label: "Member since", value: formatDate(p.created_at) },
                { label: "Identity", value: <Badge tone={v.tone} icon={v.icon}>{v.label}</Badge> },
              ]} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader><CardTitle>Contact & emergency details</CardTitle></CardHeader>
            <CardBody>
              <ProfileForm initial={{
                phone: p.phone ?? "", addressLine: p.address_line ?? "", stateOfResidence: p.state_of_residence ?? "", lga: p.lga ?? "",
                preferredLanguage: p.preferred_language ?? "en", emergencyContactName: p.emergency_contact_name ?? "",
                emergencyContactPhone: p.emergency_contact_phone ?? "", emergencyContactRelationship: p.emergency_contact_relationship ?? "",
              }} />
            </CardBody>
          </Card>
        </div>
        <aside className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Patient identification</CardTitle></CardHeader>
            <CardBody className="space-y-3">
              <HealthIdChip value={p.health_id} />
              <p className="text-sm leading-6 text-ink-3">Give this to a hospital so they can find you and send a request. It doesn't give anyone access to your records on its own.</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader><CardTitle>Representatives</CardTitle></CardHeader>
            <CardBody>
              {reps.length === 0 ? <p className="text-sm text-ink-3">Nobody else can manage your record.</p> : (
                <ul className="space-y-3">{reps.map((r) => (
                  <li key={r.id} className="text-sm"><p className="font-medium text-ink">{r.display_name}</p>
                    <p className="text-ink-3">{r.relationship.replace(/_/g, " ")} · <Badge tone={r.status === "active" ? "success" : "warning"}>{r.status.replace(/_/g, " ")}</Badge></p></li>
                ))}</ul>
              )}
              <p className="mt-4 text-xs leading-5 text-ink-3">Parents, guardians and legal representatives are only activated after our team checks their legal documents.</p>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
