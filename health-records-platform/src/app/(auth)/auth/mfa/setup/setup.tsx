"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { OtpForm } from "../form";
import { beginMfaSetupAction, confirmMfaSetupAction } from "../../../actions";

export function MfaSetup() {
  const [data, setData] = useState<{ qr: string; secret: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!data) {
    return (
      <div className="space-y-4">
        <FormError message={error} />
        <Button size="lg" block loading={pending} icon="qr_code_2" onClick={() => start(async () => {
          const res = await beginMfaSetupAction();
          if (res.ok) setData(res.data!); else setError(res.error);
        })}>Show my setup code</Button>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <ol className="space-y-5 text-sm text-ink-2">
        <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-sunken text-xs font-semibold">1</span>
          Install an authenticator app such as Google Authenticator or Microsoft Authenticator.</li>
        <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-sunken text-xs font-semibold">2</span>
          <span>Scan this code with the app, or type the key in manually.
            <span className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.qr} alt="QR code for your authenticator app" width={168} height={168} className="rounded-md border border-line bg-white p-1.5" />
              <code className="break-all rounded-md bg-sunken px-3 py-2 font-mono text-[13px] tracking-wider text-ink">{data.secret.match(/.{1,4}/g)?.join(" ")}</code>
            </span>
          </span></li>
        <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-sunken text-xs font-semibold">3</span>
          Enter the 6-digit code the app shows.</li>
      </ol>
      <OtpForm action={confirmMfaSetupAction} submitLabel="Turn on two-step verification" />
    </div>
  );
}
