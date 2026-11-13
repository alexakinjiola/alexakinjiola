import { Badge } from "@/components/ui/badge";
import { SOURCE } from "@/lib/labels";

/** Where a record came from. Patient uploads are never presented as verified. */
export function ProvenanceBadge({ source, short = true }: { source: string; short?: boolean }) {
  const s = SOURCE[source] ?? SOURCE.administrative_migration;
  return <Badge tone={s.tone} icon={s.icon}>{short ? s.short : s.label}</Badge>;
}

/** Thin left rule that encodes provenance at a glance (always paired with a text badge). */
export const provenanceRule = (source: string) =>
  source === "patient_upload" ? "before:bg-[#c9b48a]" : source === "integration" ? "before:bg-info-fg" : "before:bg-brand-600";
