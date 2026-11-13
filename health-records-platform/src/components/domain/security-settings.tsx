import Link from "next/link";
import type { Actor } from "@/lib/auth/actor";
import { listSessions } from "@/server/auth";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatDateTime, relativeTime } from "@/lib/format";
import { ChangePasswordForm, DisableMfaButton, PhoneVerify, RevokeSessionButton } from "./security-forms";

export async function SecuritySettings({ actor }: { actor: Actor }) {
  const sessions = await listSessions(actor);
  const mfaRequired = !!actor.professional || actor.platformRoles.length > 0;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Icon name="password" size={22} className="mt-0.5 text-brand-600" />
            <div><CardTitle>Two-step verification</CardTitle>
              <p className="text-sm text-ink-3">A code from an authenticator app when you sign in and before sensitive actions.</p></div>
          </div>
          {actor.mfaEnabled ? (
            <div className="flex items-center gap-2"><Badge tone="success" icon="check_circle">On</Badge>{!mfaRequired && <DisableMfaButton />}</div>
          ) : (
            <Button asChild size="sm"><Link href="/auth/mfa/setup">Turn on</Link></Button>
          )}
        </CardHeader>
        {mfaRequired && <CardBody className="py-3 text-sm text-ink-3">Required for your account because you can access other people's information.</CardBody>}
      </Card>
      <Card>
        <CardHeader><div className="flex items-start gap-3"><Icon name="mobile" size={22} className="mt-0.5 text-brand-600" />
          <div><CardTitle>Phone number</CardTitle><p className="text-sm text-ink-3">{actor.phone ?? "No phone number on file"}</p></div></div>
          {actor.phoneVerified ? <Badge tone="success" icon="check_circle">Verified</Badge> : actor.phone ? <PhoneVerify /> : null}
        </CardHeader>
      </Card>
      <Card>
        <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
        <CardBody><ChangePasswordForm /></CardBody>
      </Card>
      <Card>
        <CardHeader><div><CardTitle>Where you're signed in</CardTitle><p className="text-sm text-ink-3">Sign out any device you don't recognise, then change your password.</p></div></CardHeader>
        <ul className="divide-y divide-line">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-4 px-5 py-3.5 sm:px-6">
              <Icon name="devices" size={22} className="text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{s.device_label} {s.current && <Badge tone="brand" className="ml-1">This device</Badge>}</p>
                <p className="text-xs text-ink-3">Signed in {formatDateTime(s.created_at)} · active {relativeTime(s.last_seen_at)}{s.ip ? ` · ${s.ip}` : ""}</p>
              </div>
              {!s.current && <RevokeSessionButton id={s.id} />}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
