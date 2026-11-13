import { Icon, type IconName } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { categoryLabel, purposeLabel } from "@/lib/labels";
import { cn } from "@/lib/cn";

export interface ActivityRow {
  event_key: string; occurred_at: string; kind: string; action: string; outcome: string; institution_name: string | null;
  actor_name: string | null; record_title: string | null; category_key: string | null; purpose: string | null;
  authorization_ref: string | null; access_event_id: string | number | null;
}

const ACTION_TEXT: Record<string, string> = {
  view_record: "viewed a record", view_record_list: "viewed your list of shared records", view_patient_summary: "opened your summary",
  download_attachment: "downloaded a file", submit_record: "added a record", emergency_access: "used emergency access",
  search_patient: "looked up your Health ID", attachment_download: "You downloaded a file",
  "access_request.created": "asked to view your records", "access_request.rejected": "Request declined",
  "access_request.cancelled": "withdrew an access request", "access_request.expired": "Request expired without a response",
  "permission.granted": "Access granted", "permission.revoked": "Access revoked", "permission.expired": "Permission expired",
  "permission.emergency_access": "Emergency access opened", "permission.suspended": "Access paused",
  "record.uploaded_by_patient": "You uploaded a document", "record.correction_requested": "You raised a query on a record",
  "record.marked_in_error": "You marked an upload as an error",
};

const KIND: Record<string, { icon: IconName; tone: string }> = {
  viewed: { icon: "visibility", tone: "bg-info-bg text-info-fg" },
  downloaded: { icon: "download", tone: "bg-info-bg text-info-fg" },
  exported: { icon: "download", tone: "bg-sunken text-ink-2" },
  submitted: { icon: "upload_file", tone: "bg-brand-50 text-brand-700" },
  blocked: { icon: "block", tone: "bg-danger-bg text-danger-fg" },
  emergency: { icon: "emergency", tone: "bg-danger-bg text-danger-fg" },
  request: { icon: "pending_actions", tone: "bg-warning-bg text-warning-fg" },
  permission: { icon: "shield_person", tone: "bg-brand-50 text-brand-700" },
  record: { icon: "description", tone: "bg-sunken text-ink-2" },
  lookup: { icon: "person_search", tone: "bg-sunken text-ink-2" },
  other: { icon: "history", tone: "bg-sunken text-ink-2" },
};

export function describeActivity(a: ActivityRow) {
  const verb = ACTION_TEXT[a.action] ?? a.action.replace(/[._]/g, " ");
  if (a.kind === "blocked") return `${a.institution_name ?? "Someone"} tried to access your information and was blocked`;
  if (["viewed", "downloaded", "submitted", "emergency", "lookup"].includes(a.kind) || a.action === "access_request.created" || a.action === "access_request.cancelled") {
    const who = a.actor_name ? `${a.actor_name}${a.institution_name ? ` at ${a.institution_name}` : ""}` : (a.institution_name ?? "An institution");
    return `${who} ${verb}`;
  }
  return a.institution_name && !verb.startsWith("You") ? `${verb} — ${a.institution_name}` : verb;
}

export function ActivityItem({ a, action, compact }: { a: ActivityRow; action?: React.ReactNode; compact?: boolean }) {
  const k = KIND[a.kind] ?? KIND.other;
  return (
    <li className={cn("flex gap-4", compact ? "py-3" : "px-5 py-4 sm:px-6")}>
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", k.tone)}><Icon name={k.icon} size={18} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-6 text-ink">{describeActivity(a)}</p>
        <p className="text-[13px] text-ink-3">
          <time dateTime={a.occurred_at}>{formatDateTime(a.occurred_at)}</time>
          {a.record_title ? ` · ${a.record_title}` : a.category_key ? ` · ${categoryLabel(a.category_key)}` : ""}
        </p>
        {!compact && (a.purpose || a.authorization_ref || a.outcome !== "recorded") && (
          <div className="mt-2 flex flex-wrap gap-2">
            {a.outcome === "denied" && <Badge tone="danger" icon="block">Blocked</Badge>}
            {a.outcome === "allowed" && <Badge tone="success" dot>Allowed</Badge>}
            {a.purpose && a.kind !== "exported" && <Badge tone="neutral">Purpose: {purposeLabel(a.purpose)}</Badge>}
            {a.authorization_ref && <Badge tone="neutral"><span className="font-mono">{a.authorization_ref}</span></Badge>}
          </div>
        )}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </li>
  );
}
