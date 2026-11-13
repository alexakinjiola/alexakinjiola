"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { FormError } from "@/components/ui/form-error";
import { RadioCards } from "@/components/ui/radio-group";
import { Icon } from "@/components/ui/icon";
import { searchPatientAction } from "../actions";

type Result = { patient_id: string; masked_name: string; birth_year: number; sex: string; health_id_hint: string; has_active_permission: boolean; has_pending_request: boolean };
const SEX: Record<string, string> = { female: "Female", male: "Male", intersex: "Intersex", undisclosed: "Not stated" };

export function PatientSearch({ canSubmit, canView }: { canSubmit: boolean; canView: boolean }) {
  const [method, setMethod] = useState<"health_id" | "phone" | "nin">("health_id");
  const [v, setV] = useState({ healthId: "", phone: "", nin: "", dob: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-6">
      <form noValidate className="space-y-5" onSubmit={(e) => { e.preventDefault(); setErrors({}); setError(null); start(async () => {
        const res = await searchPatientAction({ method, ...v });
        if (res.ok) setResults(res.data!); else { setErrors(res.fieldErrors ?? {}); if (!res.fieldErrors) setError(res.error); }
      }); }}>
        <RadioCards name="method" ariaLabel="Search by" columns={3} value={method} onValueChange={(m) => { setMethod(m as typeof method); setResults(null); }} options={[
          { value: "health_id", label: "Health ID", description: "From the patient's app or card" },
          { value: "phone", label: "Phone + date of birth", description: "Both must match exactly" },
          { value: "nin", label: "NIN + date of birth", description: "NIN is checked as a protected hash" },
        ]} />
        <div className="grid gap-4 sm:grid-cols-2">
          {method === "health_id" && <Field label="Health ID" error={errors.healthId}><Input className="font-mono tracking-wider" placeholder="NG 0000 0000 00" value={v.healthId} onChange={(e) => setV({ ...v, healthId: e.target.value })} /></Field>}
          {method === "phone" && <Field label="Phone number" error={errors.phone}><Input type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></Field>}
          {method === "nin" && <Field label="NIN" error={errors.nin}><Input inputMode="numeric" maxLength={11} value={v.nin} onChange={(e) => setV({ ...v, nin: e.target.value.replace(/\D/g, "") })} /></Field>}
          {method !== "health_id" && <Field label="Date of birth" error={errors.dob}><Input type="date" value={v.dob} onChange={(e) => setV({ ...v, dob: e.target.value })} /></Field>}
        </div>
        <FormError message={error} />
        <Button type="submit" icon="search" loading={pending}>Search</Button>
      </form>
      {results !== null && (
        <section aria-live="polite" aria-label="Search results">
          {results.length === 0 ? (
            <Callout tone="neutral" title="No verified patient matched">
              Check the details with the patient. Only patients who have verified their identity can be found. If they can't be found, they can share their Health ID from their account, or contact support.
            </Callout>
          ) : results.map((r) => (
            <div key={r.patient_id} className="rounded-lg border border-line bg-surface p-5 shadow-xs">
              <div className="flex flex-wrap items-start gap-4">
                <span className="grid size-11 place-items-center rounded-full bg-navy-800 text-white"><Icon name="person" size={22} /></span>
                <div className="flex-1">
                  <p className="text-lg font-semibold text-ink">{r.masked_name}</p>
                  <p className="text-sm text-ink-3">Born {r.birth_year} · {SEX[r.sex]} · Health ID ending <span className="font-mono">{r.health_id_hint.slice(-4)}</span></p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone="success" icon="verified_user">Identity verified</Badge>
                    {r.has_active_permission && <Badge tone="brand">Your institution has access</Badge>}
                    {r.has_pending_request && <Badge tone="warning">Request pending</Badge>}
                  </div>
                </div>
              </div>
              <p className="mt-4 rounded-md bg-canvas px-3 py-2 text-[13px] text-ink-3">Confirm this is the right person with the patient before continuing. Identifying a patient doesn't give you access to any records.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {r.has_active_permission && canView && <Button asChild size="sm"><Link href={`/provider/patients/${r.patient_id}`}>Open authorised records</Link></Button>}
                {!r.has_pending_request && <Button asChild size="sm" variant={r.has_active_permission ? "secondary" : "primary"}><Link href={`/provider/requests/new?patient=${r.patient_id}`}>Request access</Link></Button>}
                {canSubmit && <Button asChild size="sm" variant="secondary" icon="upload_file"><Link href={`/provider/submit?patient=${r.patient_id}`}>Submit a record</Link></Button>}
                {canView && <Button asChild size="sm" variant="ghost" icon="emergency"><Link href={`/provider/patients/${r.patient_id}/emergency`}>Emergency access</Link></Button>}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
