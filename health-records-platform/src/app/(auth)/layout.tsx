import { Logo } from "@/components/shell/logo";
import { Icon, type IconName } from "@/components/ui/icon";
import { SkipLink } from "@/components/shell/skip-link";

const POINTS: { icon: IconName; title: string; body: string }[] = [
  { icon: "shield_person", title: "You decide who sees what", body: "Hospitals must ask. You choose the records, the purpose and how long." },
  { icon: "history", title: "Every view is recorded", body: "See exactly who opened your records, when, and under which permission." },
  { icon: "verified", title: "Verified institutions only", body: "Providers are checked before they can request or add records." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <SkipLink />
      <aside className="relative hidden overflow-hidden bg-navy-900 text-white lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-10 xl:px-16">
        <Logo inverted />
        <div className="max-w-md">
          <p className="eyebrow !text-navy-300">A personal health record for Nigeria</p>
          <p className="mt-4 font-display text-[2.6rem] leading-[1.12] font-normal tracking-[-0.02em]">
            Your health records should follow you — not stay behind at the last hospital.
          </p>
          <ul className="mt-10 space-y-6">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-white/[0.06] text-brand-200 ring-1 ring-white/10">
                  <Icon name={p.icon} size={22} />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold">{p.title}</span>
                  <span className="mt-0.5 block text-sm leading-6 text-navy-200">{p.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-navy-300">Information is encrypted in transit and at rest. We never put health details in emails or texts.</p>
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 size-[28rem] rounded-full border border-white/[0.06]" />
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[20rem] rounded-full border border-white/[0.06]" />
      </aside>
      <div className="flex min-h-dvh flex-col">
        <div className="px-5 pt-5 lg:hidden"><Logo /></div>
        <main id="main" className="flex flex-1 items-start justify-center px-5 py-10 sm:items-center sm:px-8">
          <div className="w-full max-w-[440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
