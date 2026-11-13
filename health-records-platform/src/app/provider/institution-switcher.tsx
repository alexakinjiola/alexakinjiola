"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchInstitutionAction } from "./actions";

export function InstitutionSwitcher({ current, options }: { current: string; options: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select aria-label="Switch institution" value={current} disabled={pending}
      onChange={(e) => start(async () => { await switchInstitutionAction(e.target.value); router.push("/provider"); router.refresh(); })}
      className="mt-2 h-9 w-full rounded-sm border border-white/15 bg-navy-800 px-2 text-sm text-white">
      {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}
