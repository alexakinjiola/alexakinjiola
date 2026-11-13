import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProviderContext } from "@/lib/auth/provider-context";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { PatientSearch } from "./search";

export const metadata: Metadata = { title: "Patient search" };

export default async function SearchPage() {
  const { can } = await requireProviderContext("/provider/search");
  if (!can("access:request")) redirect("/provider");
  return (
    <div className="animate-fade-in">
      <PageHeader title="Find a patient" description="Use an approved identifier. Results confirm identity only — no clinical information is shown, and every search is logged." />
      <Card className="max-w-3xl"><CardBody className="sm:p-8"><PatientSearch canSubmit={can("records:submit")} canView={can("records:view_authorized")} /></CardBody></Card>
    </div>
  );
}
