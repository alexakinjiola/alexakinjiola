import type { Metadata } from "next";
import Link from "next/link";
import { requirePatientContext } from "@/lib/auth/actor";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { UploadForm } from "./form";

export const metadata: Metadata = { title: "Upload a record" };

export default async function UploadPage() {
  await requirePatientContext("/records/upload");
  return (
    <div className="animate-fade-in">
      <Link href="/records" className="inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"><Icon name="arrow_back" size={18} />My health records</Link>
      <PageHeader className="mt-4" title="Upload a record" description="Add results, letters or prescriptions you already have on paper or as files." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card><CardBody className="sm:p-8"><UploadForm /></CardBody></Card>
        <aside className="space-y-4 text-sm text-ink-2">
          <div className="rounded-lg border border-line bg-surface p-5">
            <p className="font-semibold text-ink">What happens to your file</p>
            <ul className="mt-3 space-y-3">
              {[["fact_check", "We check it's a genuine PDF or image and scan it for harmful content."],
                ["lock", "It's encrypted and stored privately. There's no public link to it."],
                ["upload_file", "It's labelled as uploaded by you, so it's never mistaken for a verified hospital record."]].map(([i, t]) => (
                <li key={t} className="flex gap-3"><Icon name={i as "lock"} size={20} className="text-brand-600" /><span>{t}</span></li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
