import "server-only";
import { withActor } from "@/lib/db";

/**
 * Patient-side reads. Every query runs as the signed-in user under RLS, and
 * the patient id comes from requirePatientContext() — the database still
 * re-checks app.can_act_for_patient() on every row.
 */

export async function dashboardData(userId: string, patientId: string) {
  return withActor(userId, async (tx) => {
    const [profile] = await tx`
      select pp.full_name, pp.date_of_birth, pp.sex, p.verification_status, p.status, h.value as health_id,
             pp.emergency_contact_name, pp.phone
      from patients p join patient_profiles pp on pp.patient_id = p.id
      left join health_identifiers h on h.patient_id = p.id and h.identifier_type = 'platform_hid'
      where p.id = ${patientId}`;
    const [counts] = await tx`
      select count(*) filter (where status <> 'entered_in_error')::int as records,
             count(distinct institution_id)::int as institutions,
             count(*) filter (where source = 'patient_upload' and status <> 'entered_in_error')::int as uploads
      from medical_records where patient_id = ${patientId}`;
    const pending = await tx`
      select ar.id, ar.reference, ar.purpose, ar.created_at, ar.respond_by, i.name as institution_name,
             (select count(*)::int from access_request_categories c where c.request_id = ar.id) as categories
      from access_requests ar join healthcare_institutions i on i.id = ar.institution_id
      where ar.patient_id = ${patientId} and ar.status = 'pending' and ar.respond_by > now()
      order by ar.created_at desc limit 5`;
    const [perm] = await tx`
      select count(*)::int as active, min(expires_at) as next_expiry
      from permissions where patient_id = ${patientId} and status = 'active' and expires_at > now()`;
    const activity = await tx`select * from app.patient_activity(${patientId}, null, null, null, null, 6, 0)`;
    const notifications = await tx`
      select id, title, body, link, severity, created_at, read_at from notifications
      where user_id = ${userId} order by created_at desc limit 4`;
    const recent = await tx`
      select r.id, r.title, r.category_key, r.clinical_date, r.source, i.name as institution_name
      from medical_records r left join healthcare_institutions i on i.id = r.institution_id
      where r.patient_id = ${patientId} and r.status <> 'entered_in_error'
      order by r.created_at desc limit 4`;
    return { profile, counts, pending, perm, activity, notifications, recent };
  });
}

export interface RecordFilters {
  q?: string; category?: string; institution?: string; source?: string; from?: string; to?: string;
  sort?: "clinical_desc" | "clinical_asc" | "uploaded_desc" | "title"; page?: number;
}
export const RECORDS_PAGE_SIZE = 12;

export async function listRecords(userId: string, patientId: string, f: RecordFilters) {
  const page = Math.max(1, f.page ?? 1);
  const order = {
    clinical_desc: "coalesce(r.clinical_date, r.created_at::date) desc, r.created_at desc",
    clinical_asc: "coalesce(r.clinical_date, r.created_at::date) asc, r.created_at asc",
    uploaded_desc: "r.created_at desc",
    title: "lower(r.title) asc",
  }[f.sort ?? "clinical_desc"];
  return withActor(userId, async (tx) => {
    const rows = await tx`
      select r.id, r.title, r.category_key, r.clinical_date, r.created_at, r.source, r.verification_status, r.status,
             r.attending_professional, r.originating_facility, r.duplicate_of, i.name as institution_name,
             (select count(*)::int from medical_record_attachments a where a.record_id = r.id) as attachments,
             (select a.id from medical_record_attachments a where a.record_id = r.id and a.scan_status = 'clean' order by a.created_at limit 1) as first_attachment,
             count(*) over ()::int as total
      from medical_records r left join healthcare_institutions i on i.id = r.institution_id
      where r.patient_id = ${patientId}
        and r.status <> 'entered_in_error'
        and (${f.q ?? null}::text is null or r.title ilike '%' || ${f.q ?? null} || '%' or coalesce(i.name, r.originating_facility, '') ilike '%' || ${f.q ?? null} || '%')
        and (${f.category ?? null}::text is null or r.category_key = ${f.category ?? null})
        and (${f.institution ?? null}::uuid is null or r.institution_id = ${f.institution ?? null}::uuid)
        and (${f.source ?? null}::text is null or r.source::text = ${f.source ?? null})
        and (${f.from ?? null}::date is null or coalesce(r.clinical_date, r.created_at::date) >= ${f.from ?? null}::date)
        and (${f.to ?? null}::date is null or coalesce(r.clinical_date, r.created_at::date) <= ${f.to ?? null}::date)
      order by ${tx.unsafe(order)}
      limit ${RECORDS_PAGE_SIZE} offset ${(page - 1) * RECORDS_PAGE_SIZE}`;
    const institutions = await tx`
      select distinct i.id, i.name from medical_records r join healthcare_institutions i on i.id = r.institution_id
      where r.patient_id = ${patientId} order by i.name`;
    const byCategory = await tx`
      select category_key, count(*)::int n from medical_records
      where patient_id = ${patientId} and status <> 'entered_in_error' group by category_key`;
    return { rows, total: rows[0]?.total ?? 0, page, institutions, byCategory };
  });
}

export async function getRecord(userId: string, recordId: string) {
  return withActor(userId, async (tx) => {
    const [record] = await tx`
      select r.*, i.name as institution_name, i.status as institution_status, i.city as institution_city, i.state as institution_state
      from medical_records r left join healthcare_institutions i on i.id = r.institution_id
      where r.id = ${recordId}`;
    if (!record) return null;
    const attachments = await tx`
      select id, file_name, mime_type, size_bytes, scan_status, created_at
      from medical_record_attachments where record_id = ${recordId} order by created_at`;
    const versions = await tx`
      select version, change_type, change_reason, created_at from record_versions where record_id = ${recordId} order by version desc`;
    const corrections = await tx`
      select id, kind, details, status, resolution_note, created_at, resolved_at
      from record_corrections where record_id = ${recordId} order by created_at desc`;
    const views = await tx`
      select e.occurred_at, i.name as institution_name, hp.full_name as actor_name, e.action
      from access_events e left join healthcare_institutions i on i.id = e.institution_id
      left join healthcare_professionals hp on hp.id = e.actor_professional_id
      where e.record_id = ${recordId} and e.outcome = 'allowed' and e.action in ('view_record','download_attachment')
      order by e.occurred_at desc limit 10`;
    return { record, attachments, versions, corrections, views };
  });
}

export async function timeline(userId: string, patientId: string, f: { category?: string; institution?: string; from?: string; to?: string }) {
  return withActor(userId, async (tx) => {
    const rows = await tx`
      select r.id, r.title, r.category_key, r.clinical_date, r.created_at, r.source, r.description,
             r.attending_professional, r.originating_facility, i.name as institution_name,
             coalesce(r.clinical_date, r.created_at::date) as event_date
      from medical_records r
      join medical_record_categories c on c.key = r.category_key and c.timeline
      left join healthcare_institutions i on i.id = r.institution_id
      where r.patient_id = ${patientId} and r.status in ('available','under_review','superseded')
        and (${f.category ?? null}::text is null or r.category_key = ${f.category ?? null})
        and (${f.institution ?? null}::uuid is null or r.institution_id = ${f.institution ?? null}::uuid)
        and (${f.from ?? null}::date is null or coalesce(r.clinical_date, r.created_at::date) >= ${f.from ?? null}::date)
        and (${f.to ?? null}::date is null or coalesce(r.clinical_date, r.created_at::date) <= ${f.to ?? null}::date)
      order by event_date desc, r.created_at desc
      limit 300`;
    const institutions = await tx`
      select distinct i.id, i.name from medical_records r join healthcare_institutions i on i.id = r.institution_id
      where r.patient_id = ${patientId} order by i.name`;
    return { rows, institutions };
  });
}

export type AccessTab = "pending" | "active" | "expired" | "revoked";

export async function accessOverview(userId: string, patientId: string, tab: AccessTab) {
  return withActor(userId, async (tx) => {
    const [counts] = await tx`
      select
        (select count(*)::int from access_requests where patient_id = ${patientId} and status = 'pending' and respond_by > now()) as pending,
        (select count(*)::int from permissions where patient_id = ${patientId} and status in ('active','suspended') and expires_at > now()) as active,
        (select count(*)::int from permissions where patient_id = ${patientId} and (status = 'expired' or (status = 'active' and expires_at <= now()))) as expired,
        (select count(*)::int from permissions where patient_id = ${patientId} and status = 'revoked') as revoked`;

    if (tab === "pending") {
      const requests = await tx`
        select ar.id, ar.reference, ar.purpose, ar.purpose_detail, ar.created_at, ar.respond_by, ar.requested_duration_days,
               ar.date_from, ar.date_to, i.name as institution_name, i.status as institution_status, i.institution_type,
               hp.full_name as professional_name, hp.profession,
               array(select category_key from access_request_categories c where c.request_id = ar.id order by category_key) as categories
        from access_requests ar
        join healthcare_institutions i on i.id = ar.institution_id
        left join healthcare_professionals hp on hp.id = ar.requested_by_professional_id
        where ar.patient_id = ${patientId} and ar.status = 'pending' and ar.respond_by > now()
        order by ar.created_at desc`;
      const history = await tx`
        select ar.id, ar.reference, ar.status, ar.created_at, ar.decided_at, i.name as institution_name
        from access_requests ar join healthcare_institutions i on i.id = ar.institution_id
        where ar.patient_id = ${patientId} and not (ar.status = 'pending' and ar.respond_by > now())
        order by coalesce(ar.decided_at, ar.created_at) desc limit 10`;
      return { counts, requests, permissions: [], history };
    }
    const where = {
      active: tx`p.status in ('active','suspended') and p.expires_at > now()`,
      expired: tx`(p.status = 'expired' or (p.status = 'active' and p.expires_at <= now()))`,
      revoked: tx`p.status = 'revoked'`,
    }[tab];
    const permissions = await tx`
      select p.id, p.reference, p.purpose, p.purpose_detail, p.status, p.authorization_basis, p.granted_at, p.expires_at,
             p.revoked_at, p.revocation_reason, p.date_from, p.date_to, p.professional_id is not null as restricted,
             i.name as institution_name, i.status as institution_status, hp.full_name as professional_name,
             array(select distinct category_key from permission_scopes s where s.permission_id = p.id) as categories,
             (select count(*)::int from permission_scopes s where s.permission_id = p.id and s.record_id is not null) as specific_records,
             (select count(*)::int from access_events e where e.permission_id = p.id and e.outcome = 'allowed') as uses
      from permissions p
      join healthcare_institutions i on i.id = p.institution_id
      left join healthcare_professionals hp on hp.id = p.professional_id
      where p.patient_id = ${patientId} and ${where}
      order by p.granted_at desc`;
    return { counts, requests: [], permissions, history: [] };
  });
}

export async function requestDetail(userId: string, requestId: string) {
  return withActor(userId, async (tx) => {
    const [{ d }] = await tx`select app.patient_request_detail(${requestId}) as d`;
    const [consent] = await tx`select id, version, title, body from consent_versions where key = 'access_grant' and retired_at is null order by version desc limit 1`;
    return { request: d, consent };
  });
}

export async function permissionDetail(userId: string, permissionId: string) {
  return withActor(userId, async (tx) => {
    const [p] = await tx`
      select p.*, i.name as institution_name, i.status as institution_status, i.institution_type, i.city, i.state,
             hp.full_name as professional_name, cv.version as consent_version, ar.reference as request_reference,
             gu.display_name as granted_by_name
      from permissions p
      join healthcare_institutions i on i.id = p.institution_id
      left join healthcare_professionals hp on hp.id = p.professional_id
      left join consent_versions cv on cv.id = p.consent_version_id
      left join access_requests ar on ar.id = p.access_request_id
      left join users gu on gu.id = p.granted_by_user_id
      where p.id = ${permissionId}`;
    if (!p) return null;
    const scopes = await tx`
      select s.category_key, s.record_id, r.title as record_title
      from permission_scopes s left join medical_records r on r.id = s.record_id
      where s.permission_id = ${permissionId} order by s.category_key`;
    const events = await tx`
      select e.id, e.occurred_at, e.action, e.outcome, hp.full_name as actor_name, r.title as record_title
      from access_events e
      left join healthcare_professionals hp on hp.id = e.actor_professional_id
      left join medical_records r on r.id = e.record_id
      where e.permission_id = ${permissionId} order by e.occurred_at desc limit 50`;
    return { p, scopes, events };
  });
}

export const ACTIVITY_PAGE_SIZE = 25;
export async function activity(userId: string, patientId: string, f: { from?: string; to?: string; institution?: string; kind?: string; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  return withActor(userId, async (tx) => {
    const rows = await tx`select * from app.patient_activity(${patientId}, ${f.from ?? null}::timestamptz,
      ${f.to ? `${f.to}T23:59:59` : null}::timestamptz, ${f.institution ?? null}::uuid, ${f.kind ?? null},
      ${ACTIVITY_PAGE_SIZE}, ${(page - 1) * ACTIVITY_PAGE_SIZE})`;
    const institutions = await tx`
      select distinct i.id, i.name from healthcare_institutions i
      where i.id in (select institution_id from access_events where patient_id = ${patientId}
                     union select institution_id from access_requests where patient_id = ${patientId})
      order by i.name`;
    return { rows, total: Number(rows[0]?.total ?? 0), page, institutions };
  });
}

export async function notifications(userId: string, filter: "all" | "unread" = "all") {
  return withActor(userId, (tx) => tx`
    select id, type, title, body, link, severity, security_critical, read_at, created_at from notifications
    where user_id = ${userId} and (${filter} = 'all' or read_at is null)
    order by created_at desc limit 100`);
}

export async function unreadCount(userId: string) {
  const [r] = await withActor(userId, (tx) => tx`select count(*)::int n from notifications where user_id = ${userId} and read_at is null`);
  return r.n as number;
}

export async function profile(userId: string, patientId: string) {
  return withActor(userId, async (tx) => {
    const [p] = await tx`
      select pp.*, p.verification_status, p.verified_at, p.status, p.created_at, h.value as health_id
      from patient_profiles pp join patients p on p.id = pp.patient_id
      left join health_identifiers h on h.patient_id = p.id and h.identifier_type = 'platform_hid'
      where pp.patient_id = ${patientId}`;
    const [nin] = await tx`select display_hint from health_identifiers where patient_id = ${patientId} and identifier_type = 'nin'`;
    const verifications = await tx`
      select provider, method, status, failure_reason, submitted_at, decided_at from identity_verifications
      where patient_id = ${patientId} order by submitted_at desc limit 5`;
    const reps = await tx`
      select pr.id, pr.relationship, pr.status, pr.valid_until, u.display_name
      from patient_representatives pr join users u on u.id = pr.representative_user_id
      where pr.patient_id = ${patientId}`;
    return { p, nin, verifications, reps };
  });
}

export async function tickets(userId: string) {
  return withActor(userId, async (tx) => {
    const rows = await tx`
      select id, reference, category, subject, status, created_at, updated_at from support_tickets
      where requester_user_id = ${userId} order by created_at desc`;
    const events = await tx`
      select e.ticket_id, e.event_type, e.note, e.to_status, e.created_at, (e.actor_user_id = ${userId}) as mine
      from support_ticket_events e where e.ticket_id in (select id from support_tickets where requester_user_id = ${userId})
      order by e.created_at`;
    return { rows, events };
  });
}

export async function notificationPrefs(userId: string) {
  return withActor(userId, (tx) => tx`select type, in_app, email from notification_preferences where user_id = ${userId}`);
}
