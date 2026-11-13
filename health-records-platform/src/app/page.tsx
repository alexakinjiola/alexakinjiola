import Link from "next/link";
import { PublicShell } from "@/components/shell/public-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon, type IconName } from "@/components/ui/icon";

const STEPS: { n: string; title: string; body: string }[] = [
  { n: "01", title: "Your records gather in one place", body: "Verified hospitals and laboratories add records directly. You can upload older results and letters yourself — clearly labelled as yours." },
  { n: "02", title: "A new hospital asks, you decide", body: "They see who you are, not what's in your record. You choose which categories, which dates and for how long — or say no." },
  { n: "03", title: "Every view leaves a trace", body: "Each time someone opens a record, it appears in your activity history with their name and the permission they used." },
];

const TRUST: { icon: IconName; title: string; body: string }[] = [
  { icon: "verified", title: "Verified institutions only", body: "Licences are checked before a hospital can request or add anything." },
  { icon: "lock", title: "Encrypted and private", body: "Documents are encrypted and never reachable through a public link." },
  { icon: "block", title: "Revoke any time", body: "Access ends immediately, even if their screen is still open." },
  { icon: "emergency", title: "Emergencies are reviewed", body: "Break-glass access is limited, time-boxed and checked afterwards." },
];

export default function Landing() {
  return (
    <PublicShell>
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
        <div className="animate-slide-up">
          <p className="eyebrow">Personal health records for Nigeria</p>
          <h1 className="mt-4 font-display text-[2.75rem] font-medium leading-[1.06] tracking-[-0.025em] text-ink sm:text-[3.6rem]">
            Your medical history should follow you.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-ink-2">
            Move cities, change hospitals or see a specialist — your diagnoses, results and prescriptions come with you.
            Nobody sees them unless you say so.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" iconRight="arrow_forward"><Link href="/register">Create your free record</Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href="/register/provider">I represent a hospital or lab</Link></Button>
          </div>
          <p className="mt-5 text-sm text-ink-3">Works on any phone browser. No app download needed.</p>
        </div>

        <figure aria-label="Example of an access request a patient receives" className="relative">
          <div className="absolute -inset-4 -z-10 rounded-[20px] bg-sand-50 ring-1 ring-sand-100" aria-hidden />
          <div className="rounded-lg border border-line bg-surface shadow-lg">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-warning-bg text-warning-fg"><Icon name="pending_actions" size={20} /></span>
                <div><p className="text-sm font-semibold text-ink">New access request</p><p className="text-xs text-ink-3">2 minutes ago</p></div>
              </div>
              <Badge tone="warning">Your decision</Badge>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div>
                <p className="text-[15px] font-semibold text-ink">Ikeja Specialist Hospital</p>
                <p className="text-sm text-ink-3">Dr Chidi Eze · Cardiology · <span className="text-success-fg">Verified</span></p>
              </div>
              <blockquote className="border-l-2 border-brand-200 pl-3 text-sm leading-6 text-ink-2">"Referred for blood pressure review. I need recent lab results and current medicines."</blockquote>
              <div className="flex flex-wrap gap-1.5"><Badge tone="brand" icon="science">Lab results</Badge><Badge tone="brand" icon="medication">Prescriptions</Badge><Badge tone="neutral">30 days</Badge></div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <span className="inline-flex h-10 items-center justify-center rounded-md border border-line-strong text-sm font-medium text-ink">Decline</span>
                <span className="inline-flex h-10 items-center justify-center rounded-md bg-brand-600 text-sm font-medium text-white">Review & approve</span>
              </div>
            </div>
          </div>
          <figcaption className="mt-6 text-center text-xs text-ink-3">Illustration with synthetic details.</figcaption>
        </figure>
      </section>

      <section aria-labelledby="how" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <h2 id="how" className="max-w-2xl font-display text-[2rem] font-medium leading-tight text-ink">How it works</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n}>
                <p className="font-mono text-sm text-brand-600">{s.n}</p>
                <h3 className="mt-3 text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 leading-7 text-ink-3">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="trust" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 id="trust" className="font-display text-[2rem] font-medium leading-tight text-ink">Built so you can trust it</h2>
            <p className="mt-4 leading-7 text-ink-3">Health information is among the most personal there is. Privacy isn't a setting here — it's how the platform works, enforced on our servers, not just on your screen.</p>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
            {TRUST.map((t) => (
              <li key={t.title} className="bg-surface p-6">
                <Icon name={t.icon} size={24} className="text-brand-600" />
                <p className="mt-4 font-semibold text-ink">{t.title}</p>
                <p className="mt-1 text-sm leading-6 text-ink-3">{t.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-lg bg-navy-900 px-8 py-10 text-white sm:flex-row sm:items-center sm:px-12">
          <div><h2 className="font-display text-2xl font-medium">For hospitals, clinics and laboratories</h2>
            <p className="mt-2 max-w-xl text-navy-200">Keep your existing systems. Submit records with full provenance and request history with the patient's permission.</p></div>
          <Button asChild size="lg" variant="secondary"><Link href="/register/provider">Register your institution</Link></Button>
        </div>
      </section>
    </PublicShell>
  );
}
