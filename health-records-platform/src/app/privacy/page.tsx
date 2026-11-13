import type { Metadata } from "next";
import { PublicShell } from "@/components/shell/public-shell";
import { Callout } from "@/components/ui/callout";
import { withAnon } from "@/lib/db";

export const metadata: Metadata = { title: "Privacy notice" };
export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const docs = await withAnon((tx) => tx`select distinct on (key) key, title, body, version from policy_documents order by key, version desc`);
  return (
    <PublicShell>
      <article className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
        <h1 className="font-display text-[2.25rem] font-medium text-ink">Privacy & data protection</h1>
        <Callout tone="warning" className="mt-6">Draft for pilot preparation. These notices must be reviewed by qualified Nigerian privacy and healthcare counsel (NDPA 2023, NDPC guidance, National Health Act) before production use.</Callout>
        {docs.map((d) => (
          <section key={d.key} className="mt-10"><h2 className="text-xl font-semibold text-ink">{d.title}</h2>
            <p className="mt-1 text-xs text-ink-3">Version {d.version}</p><p className="mt-3 leading-7 text-ink-2">{d.body}</p></section>
        ))}
      </article>
    </PublicShell>
  );
}
