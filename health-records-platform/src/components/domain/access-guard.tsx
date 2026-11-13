"use client";
import * as React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

/**
 * Keeps an open clinical screen honest: polls the server every 20s (and on
 * focus/reconnect). On revocation/expiry it hides the content immediately.
 */
export function AccessGuard({ patientId, institutionId, expiresAt, children }: { patientId: string; institutionId: string; expiresAt: string; children: React.ReactNode }) {
  const [state, setState] = React.useState<{ active: boolean; expiresAt: string; reason?: string | null }>({ active: true, expiresAt });
  const [now, setNow] = React.useState(() => Date.now());
  const [offline, setOffline] = React.useState(false);

  React.useEffect(() => {
    let stop = false;
    const check = async () => {
      try {
        const res = await fetch(`/api/provider/access-status/${patientId}?institution=${institutionId}`, { cache: "no-store" });
        const body = await res.json();
        if (!stop) { setState({ active: !!body.active, expiresAt: body.expiresAt ?? expiresAt, reason: body.reason }); setOffline(false); }
      } catch { if (!stop) setOffline(true); }
    };
    const id = setInterval(check, 20_000);
    const tick = setInterval(() => setNow(Date.now()), 15_000);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    return () => { stop = true; clearInterval(id); clearInterval(tick); window.removeEventListener("focus", onFocus); window.removeEventListener("online", onFocus); };
  }, [patientId, institutionId, expiresAt]);

  const msLeft = new Date(state.expiresAt).getTime() - now;
  const expired = msLeft <= 0;
  if (!state.active || expired) {
    return (
      <div role="alert" className="rounded-lg border border-danger-line bg-surface p-10 text-center shadow-xs">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-danger-bg text-danger-fg"><Icon name="lock" size={28} /></span>
        <h2 className="mt-4 text-xl font-semibold text-ink">Access to this patient has ended</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-3">
          {state.reason === "no_active_permission" || expired ? "The permission was revoked by the patient or has expired. Records are no longer available here." : "Your authorisation for this institution is no longer valid."}
          {" "}Request access again if you still need it.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="secondary"><Link href="/provider/patients">Back to patients</Link></Button>
          <Button asChild><Link href={`/provider/requests/new?patient=${patientId}`}>Request access</Link></Button>
        </div>
      </div>
    );
  }
  const mins = Math.floor(msLeft / 60_000);
  return (
    <>
      {offline && <p role="status" className="mb-4 flex items-center gap-2 rounded-md border border-warning-line bg-warning-bg px-3 py-2 text-sm text-warning-fg"><Icon name="wifi_off" size={18} />Connection lost — access will be re-checked when you're back online.</p>}
      {mins < 60 * 24 && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-md border border-warning-line bg-warning-bg px-3 py-2 text-sm font-medium text-warning-fg">
          <Icon name="hourglass_top" size={18} />Access expires in {mins < 60 ? `${mins} minute${mins === 1 ? "" : "s"}` : `${Math.floor(mins / 60)} hours`}.
        </p>
      )}
      {children}
    </>
  );
}
