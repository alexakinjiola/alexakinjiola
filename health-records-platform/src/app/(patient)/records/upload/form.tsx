"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Icon } from "@/components/ui/icon";
import { FileDrop, checkFileClientSide, uploadWithProgress } from "@/components/domain/file-drop";
import { CATEGORY, CATEGORY_KEYS } from "@/lib/labels";

type Values = { category: string; title: string; clinicalDate: string; facility: string; description: string };
type Phase = { s: "idle" } | { s: "uploading"; pct: number } | { s: "processing" } | { s: "error"; message: string } | { s: "done"; recordId: string };

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ s: "idle" });
  const form = useForm<Values>({ defaultValues: { category: "", title: "", clinicalDate: "", facility: "", description: "" } });
  const e = form.formState.errors;
  const busy = phase.s === "uploading" || phase.s === "processing";

  const submit = form.handleSubmit(async (v) => {
    if (!file) { setFileError("Choose a file to upload."); return; }
    const problem = checkFileClientSide(file);
    if (problem) { setFileError(problem); return; }
    const data = new FormData();
    Object.entries(v).forEach(([k, val]) => data.append(k, val));
    data.append("file", file);
    setPhase({ s: "uploading", pct: 0 });
    const res = await uploadWithProgress("/api/records/upload", data, (pct) => setPhase(pct >= 100 ? { s: "processing" } : { s: "uploading", pct }));
    if (res.body.ok) { setPhase({ s: "done", recordId: res.body.recordId as string }); return; }
    if (res.body.fieldErrors) {
      for (const [k, msg] of Object.entries(res.body.fieldErrors)) form.setError(k as keyof Values, { message: msg });
      setPhase({ s: "idle" });
      return;
    }
    if ([413, 415, 422].includes(res.status)) setFileError(res.body.error ?? null);
    setPhase({ s: "error", message: res.body.error ?? "Upload failed." });
  });

  if (phase.s === "done") {
    return (
      <div role="status" className="rounded-lg border border-success-line bg-surface p-8 text-center shadow-xs">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-success-bg text-success-fg"><Icon name="task_alt" size={30} /></span>
        <h2 className="mt-4 text-xl font-semibold text-ink">Uploaded and stored securely</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-3">
          It's on your record and timeline, labelled as a document you provided. Nobody else can see it unless you approve a request that includes it.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild><Link href={`/records/${phase.recordId}`}>View record</Link></Button>
          <Button asChild variant="secondary"><Link href="/timeline">See it on your timeline</Link></Button>
          <Button variant="ghost" onClick={() => { form.reset(); setFile(null); setPhase({ s: "idle" }); }}>Upload another</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {phase.s === "error" && (
        <Callout tone="danger" role="alert" title="Upload didn't finish" action={<Button size="sm" variant="secondary" icon="restart_alt" type="submit">Try again</Button>}>
          {phase.message}
        </Callout>
      )}
      <fieldset className="space-y-2" disabled={busy}>
        <legend className="mb-2 text-sm font-medium text-ink">1. Choose the document</legend>
        <FileDrop file={file} onFile={(f) => { setFile(f); setFileError(f ? checkFileClientSide(f) : null); if (phase.s === "error") setPhase({ s: "idle" }); }} error={fileError} disabled={busy} />
      </fieldset>
      <fieldset className="space-y-5" disabled={busy}>
        <legend className="mb-1 text-sm font-medium text-ink">2. Describe it</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category" error={e.category?.message} required>
            <Select {...form.register("category", { required: "Choose a category." })}>
              <option value="" disabled>Choose a category…</option>
              {CATEGORY_KEYS.map((k) => <option key={k} value={k}>{CATEGORY[k].label}</option>)}
            </Select>
          </Field>
          <Field label="Date of the test or visit" hint="Leave blank if you don't know." error={e.clinicalDate?.message} optional>
            <Input type="date" max={new Date().toISOString().slice(0, 10)} {...form.register("clinicalDate")} />
          </Field>
        </div>
        <Field label="Title" hint="For example: Full blood count, or Discharge letter from LUTH." error={e.title?.message} required>
          <Input {...form.register("title", { required: "Give the record a title.", minLength: { value: 3, message: "Use at least 3 characters." } })} maxLength={200} />
        </Field>
        <Field label="Hospital, clinic or laboratory" hint="Where the document came from." error={e.facility?.message} optional>
          <Input {...form.register("facility")} maxLength={200} />
        </Field>
        <Field label="Notes" error={e.description?.message} optional>
          <Textarea rows={3} {...form.register("description")} maxLength={2000} />
        </Field>
      </fieldset>
      {busy && (
        <div role="status" aria-live="polite" className="rounded-md border border-line bg-surface p-4">
          <div className="flex justify-between text-sm"><span className="font-medium text-ink">{phase.s === "uploading" ? "Uploading…" : "Checking and encrypting…"}</span>
            {phase.s === "uploading" && <span className="tabular text-ink-3">{phase.pct}%</span>}</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunken">
            <div className={`h-full rounded-full bg-brand-600 transition-[width] ${phase.s === "processing" ? "w-full animate-pulse" : ""}`}
              style={phase.s === "uploading" ? { width: `${phase.pct}%` } : undefined} />
          </div>
        </div>
      )}
      <div className="flex flex-col-reverse gap-2 border-t border-line pt-6 sm:flex-row sm:justify-end">
        <Button asChild variant="secondary"><Link href="/records">Cancel</Link></Button>
        <Button type="submit" icon="upload" loading={busy}>Upload securely</Button>
      </div>
    </form>
  );
}
