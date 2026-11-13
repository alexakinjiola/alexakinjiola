"use client";
import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { updateNotificationPrefsAction } from "../../actions";

const OPTIONAL = [
  ["new_record", "New records added", "When an institution adds a record to your account."],
  ["access_granted", "Sharing confirmations", "When you approve a request."],
  ["access_request_decision", "Request outcomes", "When a request closes."],
  ["permission_expired", "Permissions ending", "When access you granted reaches its end date."],
  ["record_correction", "Record queries", "Responses to problems you've reported."],
  ["support", "Support updates", "Replies to your support requests."],
] as const;
const ALWAYS = [
  ["New access requests", "So you can decide in time."], ["Security alerts", "New sign-ins, password changes, locked accounts."],
  ["Emergency access", "When your records are opened in an emergency."], ["Revocations and suspicious activity", "Changes to who can see your records."],
];

export function Prefs({ initial }: { initial: Record<string, { in_app: boolean; email: boolean }> }) {
  const [state, setState] = useState(() => Object.fromEntries(OPTIONAL.map(([k]) => [k, initial[k] ?? { in_app: true, email: true }])));
  const [pending, start] = useTransition();
  const set = (k: string, ch: "in_app" | "email", v: boolean) => setState((s) => ({ ...s, [k]: { ...s[k], [ch]: v } }));
  return (
    <div className="space-y-8">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Optional notifications</caption>
          <thead><tr className="border-b border-line text-left text-xs text-ink-3"><th scope="col" className="py-2 font-medium">Notification</th><th scope="col" className="w-20 py-2 text-center font-medium">In app</th><th scope="col" className="w-20 py-2 text-center font-medium">Email</th></tr></thead>
          <tbody className="divide-y divide-line">
            {OPTIONAL.map(([k, label, desc]) => (
              <tr key={k}>
                <th scope="row" className="py-3 pr-4 text-left font-normal"><span className="block font-medium text-ink">{label}</span><span className="text-[13px] text-ink-3">{desc}</span></th>
                <td className="text-center"><Checkbox aria-label={`${label} in app`} checked={state[k].in_app} onCheckedChange={(v) => set(k, "in_app", v === true)} className="mx-auto" /></td>
                <td className="text-center"><Checkbox aria-label={`${label} by email`} checked={state[k].email} onCheckedChange={(v) => set(k, "email", v === true)} className="mx-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-md border border-line bg-canvas/60 p-4">
        <p className="text-sm font-semibold text-ink">Always on</p>
        <p className="text-[13px] text-ink-3">These protect your account and can't be turned off.</p>
        <ul className="mt-3 space-y-2">{ALWAYS.map(([l, d]) => (
          <li key={l} className="flex items-start justify-between gap-3 text-sm"><span><span className="font-medium text-ink">{l}</span> <span className="text-ink-3">— {d}</span></span><Badge tone="neutral" icon="lock">Required</Badge></li>
        ))}</ul>
      </div>
      <div className="flex justify-end"><Button loading={pending} onClick={() => start(async () => {
        const r = await updateNotificationPrefsAction(state);
        if (r.ok) toast.success(r.message!); else toast.error(r.error);
      })}>Save preferences</Button></div>
    </div>
  );
}
