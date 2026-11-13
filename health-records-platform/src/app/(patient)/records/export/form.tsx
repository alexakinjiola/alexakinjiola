"use client";
import { useState } from "react";
import { RadioCards } from "@/components/ui/radio-group";
import { CheckboxCard } from "@/components/ui/checkbox";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { FormError } from "@/components/ui/form-error";
import { CATEGORY } from "@/lib/labels";

export function ExportForm({ counts, needsReauth }: { counts: Record<string, number>; needsReauth: boolean }) {
  const cats = Object.keys(counts);
  const [format, setFormat] = useState<"pdf" | "fhir">("pdf");
  const [scope, setScope] = useState<"all" | "some">("all");
  const [chosen, setChosen] = useState<string[]>(cats);
  const [credential, setCredential] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setDone(null);
    if (scope === "some" && chosen.length === 0) { setError("Choose at least one category."); return; }
    if (needsReauth && !credential) { setError("Enter your password to confirm it's you."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/export", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, categories: scope === "some" ? chosen : undefined, credential: credential || undefined }) });
      if (!res.ok) { setError((await res.json().catch(() => null))?.error ?? "Export failed. Try again."); return; }
      const blob = await res.blob();
      const name = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "health-record";
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: name });
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      setDone(name); setCredential("");
    } catch { setError("Connection lost. Nothing was downloaded — try again."); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-7">
      <fieldset><legend className="mb-3 text-sm font-semibold text-ink">Format</legend>
        <RadioCards name="format" ariaLabel="Export format" columns={2} value={format} onValueChange={(v) => setFormat(v as "pdf" | "fhir")} options={[
          { value: "pdf", label: "Readable summary (PDF)", description: "For you, or to print and take to an appointment. Allergies and diagnoses first." },
          { value: "fhir", label: "Structured data (FHIR R4 JSON)", description: "The international health data standard, for moving to another health app or hospital system." },
        ]} /></fieldset>
      <fieldset><legend className="mb-3 text-sm font-semibold text-ink">What to include</legend>
        <RadioCards name="scope" ariaLabel="What to include" columns={2} value={scope} onValueChange={(v) => setScope(v as "all" | "some")} options={[
          { value: "all", label: "Everything", description: `${Object.values(counts).reduce((a, b) => a + b, 0)} records` },
          { value: "some", label: "Choose categories" },
        ]} />
        {scope === "some" && <div className="mt-3 grid gap-2 sm:grid-cols-2">{cats.map((c) => (
          <CheckboxCard key={c} id={`x-${c}`} label={CATEGORY[c]?.label ?? c} meta={`${counts[c]}`} checked={chosen.includes(c)}
            onCheckedChange={(on) => setChosen((s) => on ? [...s, c] : s.filter((x) => x !== c))} />
        ))}</div>}
      </fieldset>
      <Callout tone="warning" title="Keep your copy safe">
        Once downloaded, the file is outside the platform's protection. Store it securely and only share it with people you trust. The download is recorded in your activity history.
      </Callout>
      {needsReauth && <Field label="Enter your password to confirm" hint="We ask for this before health information leaves your account.">
        <Input type="password" autoComplete="current-password" value={credential} onChange={(e) => setCredential(e.target.value)} /></Field>}
      <FormError message={error} />
      {done && <Callout tone="success" role="status" title="Download started">{done} — check your downloads folder.</Callout>}
      <div className="flex justify-end border-t border-line pt-6"><Button type="submit" size="lg" icon="download" loading={busy}>Download my records</Button></div>
    </form>
  );
}
