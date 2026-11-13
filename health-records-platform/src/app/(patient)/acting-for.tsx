"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActingForAction } from "./actions";

export function ActingForSwitcher({ current, options }: { current: string; options: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="rounded-md border border-line bg-surface p-3">
      <label htmlFor="acting-for" className="eyebrow">Viewing records for</label>
      <select id="acting-for" disabled={pending} value={current}
        onChange={(e) => start(async () => { await setActingForAction(e.target.value); router.push("/dashboard"); router.refresh(); })}
        className="mt-1.5 h-9 w-full rounded-sm border border-line-strong bg-surface px-2 text-sm">
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}
