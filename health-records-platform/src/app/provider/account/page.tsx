import type { Metadata } from "next";
import { requireProviderContext } from "@/lib/auth/provider-context";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DescriptionList } from "@/components/ui/description-list";
import { SecuritySettings } from "@/components/domain/security-settings";
import { PRO_STATUS, PROFESSION } from "@/lib/labels";
import { TicketForm } from "../../(patient)/support/ticket-form";
import { providerTicketAction } from "../actions";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const { actor } = await requireProviderContext("/provider/account");
  const pro = actor.professional;
  return (
    <div className="animate-fade-in">
      <PageHeader title="My account" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <SecuritySettings actor={actor} />
        <aside className="space-y-6">
          {pro && <Card><CardHeader><CardTitle>Professional profile</CardTitle><Badge tone={PRO_STATUS[pro.verificationStatus]?.tone}>{PRO_STATUS[pro.verificationStatus]?.label}</Badge></CardHeader>
            <CardBody><DescriptionList columns={1} items={[{ label: "Name", value: pro.fullName }, { label: "Profession", value: PROFESSION[pro.profession] },
              { label: "Memberships", value: actor.affiliations.map((a) => `${a.institutionName} (${a.roleName})`).join(", ") || "None" }]} /></CardBody></Card>}
          <Card id="support"><CardHeader><CardTitle>Contact the platform team</CardTitle></CardHeader>
            <CardBody><TicketForm categories={["institution_verification", "account_access", "technical", "record_correction", "suspicious_activity", "other"]} action={providerTicketAction} /></CardBody></Card>
        </aside>
      </div>
    </div>
  );
}
