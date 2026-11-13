"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox, CheckboxCard } from "@/components/ui/checkbox";
import { RadioCards } from "@/components/ui/radio-group";
import { Field, Input, Select } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { CATEGORY } from "@/lib/labels";
import { formatDate, plural } from "@/lib/format";
import { decideRequestAction } from "../../../actions";

type Rec = { id: string; title: string; category_key: string; clinical_date: string | null; source: string };

export function DecisionForm({ request, consent, needsReauth, institutionName }: {
  request: { id: string; categories: string[]; duration_days: number; date_from: string | null; date_to: string | null; matching_records: Rec[] | null };
  consent: { version: number; title: string; body: string };
  needsReauth: boolean;
  institutionName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"approve" | "partial">("approve");
  const records = useMemo(() => request.matching_records ?? [], [request.matching_records]);
  const [openedAt] = useState(() => Date.now());
  const [cats, setCats] = useState<string[]>(request.categories);
  const [selected, setSelected] = useState<Set<string>>(new Set(records.map((r) => r.id)));
  const [days, setDays] = useState(request.duration_days);
  const [from, setFrom] = useState(request.date_from ?? "");
  const [to, setTo] = useState(request.date_to ?? "");
  const [onlyRequester, setOnlyRequester] = useState(false);
  const [ack, setAck] = useState(false);
  const [credential, setCredential] = useState("");
  const [error, setError] = useState<string | null>(null);

  const durations = [1, 3, 7, 14, 30, 60, 90, 180, 365].filter((d) => d < request.duration_days).concat(request.duration_days);
  const inScope = useMemo(() => records.filter((r) => {
    if (mode === "approve") return true;
    if (!cats.includes(r.category_key) || !selected.has(r.id)) return false;
    const d = r.clinical_date ?? "";
    return (!from || !d || d >= from) && (!to || !d || d <= to);
  }), [records, mode, cats, selected, from, to]);
  const until = new Date(openedAt + (mode === "approve" ? request.duration_days : days) * 86_400_000);

  const submit = () => {
    setError(null);
    if (!ack) { setError("Tick the box to confirm you understand what will be shared."); return; }
    if (mode === "partial" && cats.length === 0) { setError("Choose at least one category, or decline the request instead."); return; }
    if (needsReauth && !credential) { setError("Enter your password to confirm it's you."); return; }
    const recordIds = mode === "partial"
      ? cats.flatMap((c) => {
          const inCat = records.filter((r) => r.category_key === c);
          const chosen = inCat.filter((r) => selected.has(r.id));
          return chosen.length === inCat.length ? [] : chosen.map((r) => r.id);
        })
      : [];
    if (mode === "partial" && cats.every((c) => records.some((r) => r.category_key === c)) && inScope.length === 0) {
      setError("You've deselected every record. Choose at least one, or decline the request instead.");
      return;
    }
    start(async () => {
      const res = await decideRequestAction({
        requestId: request.id, decision: mode, categories: mode === "partial" ? cats : undefined,
        recordIds: recordIds.length ? recordIds : undefined, dateFrom: mode === "partial" ? from || null : undefined,
        dateTo: mode === "partial" ? to || null : undefined, durationDays: mode === "partial" ? days : undefined,
        restrictToRequester: mode === "partial" ? onlyRequester : false, credential: credential || undefined, acknowledged: ack,
      });
      if (!res.ok) { setError(res.error); return; }
      toast.success(`Access granted to ${institutionName}.`);
      router.push(res.data?.permissionId ? `/access/permissions/${res.data.permissionId}` : "/access?tab=active");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <RadioCards name="mode" ariaLabel="How much to share" value={mode} onValueChange={(v) => setMode(v as "approve" | "partial")} columns={2} options={[
        { value: "approve", label: "Share what they asked for", description: `${plural(request.categories.length, "category", "categories")} for ${plural(request.duration_days, "day")}` },
        { value: "partial", label: "Share only some of it", description: "Choose categories, records, dates and a shorter time" },
      ]} />

      {mode === "partial" && (
        <div className="space-y-6 rounded-lg border border-line bg-canvas/50 p-4 sm:p-5">
          <fieldset>
            <legend className="text-sm font-semibold text-ink">Categories and records</legend>
            <p className="mt-0.5 text-[13px] text-ink-3">Untick anything you don't want to share.</p>
            <div className="mt-3 space-y-3">
              {request.categories.map((c) => {
                const inCat = records.filter((r) => r.category_key === c);
                const on = cats.includes(c);
                return (
                  <div key={c} className="rounded-md border border-line bg-surface">
                    <CheckboxCard id={`cat-${c}`} checked={on} onCheckedChange={(v) => setCats((s) => v ? [...s, c] : s.filter((x) => x !== c))}
                      label={CATEGORY[c]?.label ?? c} meta={plural(inCat.length, "record")}
                      description={inCat.length === 0 ? "You have no records in this category yet. Future records in it would be included." : undefined} />
                    {on && inCat.length > 0 && (
                      <ul className="space-y-1 border-t border-line px-4 py-3">
                        {inCat.map((r) => (
                          <li key={r.id} className="flex items-center gap-3">
                            <Checkbox id={`rec-${r.id}`} checked={selected.has(r.id)} onCheckedChange={(v) => setSelected((s) => { const n = new Set(s); if (v) n.add(r.id); else n.delete(r.id); return n; })} />
                            <label htmlFor={`rec-${r.id}`} className="flex flex-1 cursor-pointer justify-between gap-3 py-1 text-sm">
                              <span className="text-ink">{r.title}{r.source === "patient_upload" && <span className="text-ink-3"> · your upload</span>}</span>
                              <span className="shrink-0 text-ink-3 tabular">{formatDate(r.clinical_date)}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Records from" hint="Leave blank for no limit" optional>
              <Input type="date" value={from} min={request.date_from ?? undefined} max={request.date_to ?? undefined} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="Records up to" optional>
              <Input type="date" value={to} min={request.date_from ?? undefined} max={request.date_to ?? undefined} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <Field label="For how long">
              <Select value={days} onChange={(e) => setDays(Number(e.target.value))}>
                {durations.map((d) => <option key={d} value={d}>{plural(d, "day")}</option>)}
              </Select>
            </Field>
          </div>
          <CheckboxCard id="only-requester" checked={onlyRequester} onCheckedChange={setOnlyRequester}
            label="Only the professional who asked"
            description="Otherwise, other authorised clinical staff at the institution can also see what you share — useful if a team is treating you." />
        </div>
      )}

      <div className="rounded-lg border border-brand-200 bg-brand-50/60 p-4 sm:p-5">
        <p className="eyebrow !text-brand-700">What you're about to share</p>
        <p className="mt-2 text-[15px] leading-7 text-ink">
          <strong>{institutionName}</strong> will be able to view{" "}
          <strong>{mode === "approve" ? `all ${plural(records.length, "record")}` : plural(inScope.length, "record")}</strong> in{" "}
          {(mode === "approve" ? request.categories : cats).map((c) => CATEGORY[c]?.label.toLowerCase()).join(", ") || "no categories"}
          {" "}until <strong>{formatDate(until)}</strong>{mode === "partial" && onlyRequester ? ", and only the requesting professional" : ""}.
          Every view and download will appear in your activity history.
        </p>
      </div>

      <details className="rounded-md border border-line bg-surface px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium text-ink">{consent.title} (version {consent.version})</summary>
        <p className="mt-2 leading-6 text-ink-2">{consent.body}</p>
      </details>

      <div className="flex items-start gap-3">
        <Checkbox id="ack" checked={ack} onCheckedChange={(v) => setAck(v === true)} className="mt-0.5" />
        <label htmlFor="ack" className="text-sm leading-6 text-ink-2">
          I understand what will be shared and for how long. I can revoke access at any time, but copies the institution has already saved can't be recalled.
        </label>
      </div>

      {needsReauth && (
        <Field label="Enter your password to confirm" hint="We ask for this before you share health information.">
          <Input type="password" autoComplete="current-password" value={credential} onChange={(e) => setCredential(e.target.value)} />
        </Field>
      )}
      <FormError message={error} />
      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-between">
        <DeclineButton requestId={request.id} />
        <Button size="lg" icon="check_circle" loading={pending} onClick={submit}>
          {mode === "approve" ? "Approve request" : "Approve selected access"}
        </Button>
      </div>
    </div>
  );
}

function DeclineButton({ requestId }: { requestId: string }) {
  return (
    <ConfirmDialog
      trigger={<Button variant="secondary" size="lg" icon="block">Decline</Button>}
      title="Decline this request?"
      description="The institution won't be given access, and they'll be told the request was declined. You don't have to give a reason."
      confirmLabel="Decline request"
      tone="danger"
      redirectTo="/access?tab=pending"
      successMessage="Request declined. Nothing was shared."
      reason={{ label: "Note for your records", placeholder: "Optional — only you can see this" }}
      onConfirm={({ reason }) => decideRequestAction({ requestId, decision: "reject", note: reason || undefined })}
    />
  );
}

