"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Callout } from "@/components/ui/callout";
import { Icon } from "@/components/ui/icon";
import { FileDrop, checkFileClientSide, uploadWithProgress } from "@/components/domain/file-drop";
import { CATEGORY, CATEGORY_KEYS } from "@/lib/labels";

type Row = { test: string; value: string; unit: string; reference: string; flag: string };
type V = { category: string; title: string; description: string; clinicalDate: string; encounterDate: string };

export function SubmitForm({ institutionId, patientId, needsAttestation, professional }: { institutionId: string; patientId: string; needsAttestation: boolean; professional: string }) {
  const form = useForm<V>({ defaultValues: { category: "", title: "", description: "", clinicalDate: "", encounterDate: "" } });
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [attest, setAttest] = useState(false);
  const [state, setState] = useState<{ s: "idle" | "busy" | "done" | "error"; msg?: string; id?: string; pct?: number }>({ s: "idle" });
  const e = form.formState.errors;
  const cat = form.watch("category");

  if (state.s === "done") return (
    <div role="status" className="py-6 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-success-bg text-success-fg"><Icon name="task_alt" size={30} /></span>
      <h2 className="mt-4 text-xl font-semibold text-ink">Record submitted</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-3">It's on the patient's record with your institution and name as the source, and the patient has been notified.</p>
      <div className="mt-6 flex justify-center gap-2"><Button asChild variant="secondary"><Link href="/provider/submissions">View submissions</Link></Button>
        <Button onClick={() => { form.reset(); setFile(null); setRows([]); setState({ s: "idle" }); }}>Submit another</Button></div>
    </div>
  );

  return (
    <form noValidate className="space-y-7" onSubmit={form.handleSubmit(async (v) => {
      if (needsAttestation && (!attest || !v.encounterDate)) { setState({ s: "error", msg: "Confirm the patient was seen at your institution and give the date." }); return; }
      if (file && checkFileClientSide(file)) { setFileErr(checkFileClientSide(file)); return; }
      const results = rows.filter((r) => r.test && r.value).map((r) => ({ ...r, flag: r.flag || undefined }));
      const fd = new FormData();
      Object.entries({ ...v, institutionId, patientId, attest: String(attest), structured: results.length ? JSON.stringify({ results }) : "" }).forEach(([k, val]) => fd.append(k, val));
      if (file) fd.append("files", file);
      setState({ s: "busy", pct: 0 });
      const res = await uploadWithProgress("/api/provider/records", fd, (pct) => setState({ s: "busy", pct }));
      if (res.body.ok) return setState({ s: "done", id: res.body.recordId as string });
      if (res.body.fieldErrors) { for (const [k, m] of Object.entries(res.body.fieldErrors)) form.setError(k as keyof V, { message: m }); setState({ s: "idle" }); return; }
      setState({ s: "error", msg: res.body.error });
    })}>
      {state.s === "error" && <Callout tone="danger" role="alert">{state.msg}</Callout>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category" error={e.category?.message} required>
          <Select {...form.register("category", { required: "Choose a category." })}><option value="" disabled>Choose…</option>
            {CATEGORY_KEYS.map((k) => <option key={k} value={k}>{CATEGORY[k].singular}</option>)}</Select>
        </Field>
        <Field label="Clinical date" error={e.clinicalDate?.message} required><Input type="date" max={new Date().toISOString().slice(0, 10)} {...form.register("clinicalDate", { required: "Enter the clinical date." })} /></Field>
      </div>
      <Field label="Title" error={e.title?.message} required><Input maxLength={200} {...form.register("title", { required: "Enter a title.", minLength: { value: 3, message: "Use at least 3 characters." } })} /></Field>
      <Field label="Clinical notes" hint="Shown to the patient. Write clearly; avoid unexplained abbreviations." optional><Textarea rows={5} maxLength={4000} {...form.register("description")} /></Field>
      {cat === "lab_result" && (
        <fieldset className="rounded-lg border border-line p-4">
          <legend className="px-1 text-sm font-medium text-ink">Structured results <span className="font-normal text-ink-3">(optional)</span></legend>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr_1.5fr_1fr_auto]">
                {(["test", "value", "unit", "reference"] as const).map((k) => (
                  <input key={k} aria-label={`${k} ${i + 1}`} placeholder={k[0].toUpperCase() + k.slice(1)} value={r[k]} onChange={(ev) => setRows((s) => s.map((x, j) => j === i ? { ...x, [k]: ev.target.value } : x))}
                    className="h-9 rounded-sm border border-line-strong px-2 text-sm" />
                ))}
                <select aria-label={`flag ${i + 1}`} value={r.flag} onChange={(ev) => setRows((s) => s.map((x, j) => j === i ? { ...x, flag: ev.target.value } : x))} className="h-9 rounded-sm border border-line-strong px-2 text-sm">
                  <option value="">Flag</option><option value="normal">Normal</option><option value="high">High</option><option value="low">Low</option></select>
                <Button type="button" variant="ghost" size="icon-sm" icon="remove" aria-label={`Remove row ${i + 1}`} onClick={() => setRows((s) => s.filter((_, j) => j !== i))} />
              </div>
            ))}
          </div>
          <Button type="button" variant="secondary" size="sm" icon="add" className="mt-3" onClick={() => setRows((s) => [...s, { test: "", value: "", unit: "", reference: "", flag: "" }])}>Add result</Button>
        </fieldset>
      )}
      <div><p className="mb-2 text-sm font-medium text-ink">Attachment <span className="font-normal text-ink-3">(optional)</span></p>
        <FileDrop id="sub-file" file={file} onFile={(f) => { setFile(f); setFileErr(f ? checkFileClientSide(f) : null); }} error={fileErr} /></div>
      {needsAttestation && (
        <div className="rounded-lg border border-warning-line bg-warning-bg/50 p-4">
          <p className="text-sm font-semibold text-ink">Confirm the patient's association with your institution</p>
          <p className="mt-0.5 text-[13px] text-ink-2">Your institution has no prior relationship or active permission for this patient.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_200px] sm:items-end">
            <div className="flex items-start gap-3"><Checkbox id="attest" checked={attest} onCheckedChange={(v) => setAttest(v === true)} className="mt-0.5" />
              <label htmlFor="attest" className="text-sm leading-6 text-ink-2">I confirm this patient received care at our institution and their identity was checked.</label></div>
            <Field label="Encounter date"><Input type="date" {...form.register("encounterDate")} /></Field>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-3">Submitted as {professional}. Provenance is permanent; corrections create new versions.</p>
        <Button type="submit" size="lg" icon="send" loading={state.s === "busy"}>{state.s === "busy" ? `Submitting ${state.pct ?? 0}%` : "Submit record"}</Button>
      </div>
    </form>
  );
}
