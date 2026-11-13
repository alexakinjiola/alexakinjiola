import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { InstitutionForm } from "../institution-form";

export const metadata: Metadata = { title: "Register your institution" };

export default async function NewInstitution() {
  const actor = await requireActor({ next: "/provider/institution/new" });
  if (actor.ownedInstitutionDrafts.some((d) => ["draft", "submitted", "under_review", "rejected"].includes(d.status))) redirect("/provider/institution");
  const empty = Object.fromEntries(["name","institution_type","registration_number","license_number","license_authority","license_expires_on","address_line","city","state","lga","email","phone","website","representative_name","representative_title","representative_email","representative_phone"].map((k) => [k, ""]));
  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <PageHeader eyebrow="Step 1 of 2 · Institution details" title="Register your institution" description="We use these details to verify your institution with the relevant licensing authority before you can access patient information." />
      <Card><CardBody className="sm:p-8"><InstitutionForm initial={{ ...empty, representative_name: actor.displayName, representative_email: actor.email, representative_phone: actor.phone ?? "" } as never} /></CardBody></Card>
    </div>
  );
}
