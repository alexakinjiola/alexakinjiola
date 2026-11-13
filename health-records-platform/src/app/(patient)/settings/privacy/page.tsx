import type { Metadata } from "next";
import Link from "next/link";
import { requirePatientContext } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Icon, type IconName } from "@/components/ui/icon";
import { SettingsNav } from "../settings-nav";

export const metadata: Metadata = { title: "Privacy & data" };

const RIGHTS: { icon: IconName; title: string; body: string; href: string; cta: string }[] = [
  { icon: "download", title: "Get a copy of your data", body: "Download individual documents any time, or ask for a complete copy of what we hold about you.", href: "/support?category=data_subject_request", cta: "Request a copy" },
  { icon: "edit_note", title: "Correct your information", body: "Ask us to fix personal details, or ask an institution to review a record.", href: "/support?category=profile_correction", cta: "Request a correction" },
  { icon: "person_off", title: "Close your account", body: "We'll explain what can be deleted and what must be kept under medical record retention rules.", href: "/support?category=account_closure", cta: "Ask to close account" },
];

export default async function PrivacyPage() {
  const { actor } = await requirePatientContext("/settings/privacy");
  const docs = await withActor(actor.userId, (tx) => tx`select key, title, body, version, requires_legal_review from policy_documents order by key, version desc`);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Profile & settings" />
      <SettingsNav current="privacy" />
      <div className="max-w-4xl space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {RIGHTS.map((r) => (
            <Card key={r.title} as="div"><CardBody className="flex h-full flex-col">
              <Icon name={r.icon} size={24} className="text-brand-600" />
              <p className="mt-3 font-semibold text-ink">{r.title}</p>
              <p className="mt-1 flex-1 text-sm leading-6 text-ink-3">{r.body}</p>
              <Button asChild variant="secondary" size="sm" className="mt-4 self-start"><Link href={r.href}>{r.cta}</Link></Button>
            </CardBody></Card>
          ))}
        </div>
        <Card>
          <CardHeader><CardTitle>How your information is used</CardTitle></CardHeader>
          <CardBody className="space-y-5">
            {docs.map((d) => (
              <section key={d.key}>
                <h3 className="text-sm font-semibold text-ink">{d.title} <span className="font-normal text-ink-3">· version {d.version}</span></h3>
                <p className="mt-1 text-sm leading-6 text-ink-2">{d.body}</p>
              </section>
            ))}
            <Callout tone="neutral">These documents are drafts pending review by qualified Nigerian privacy and healthcare counsel. They don't yet constitute a final legal notice.</Callout>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
