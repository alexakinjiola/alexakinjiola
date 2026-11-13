import "server-only";
import { withActor } from "@/lib/db";

export async function providerDashboard(userId: string, inst: string) {
  return withActor(userId, async (tx) => {
    const [{ d }] = await tx`select app.provider_dashboard(${inst}) as d`;
    const pending = await tx`select * from app.provider_requests(${inst}, 'pending') limit 5`;
    const submissions = await tx`select * from app.provider_submissions(${inst}) limit 5`;
    const activity = await tx`select * from app.institution_activity(${inst}, 8)`;
    const expiring = await tx`select * from app.provider_authorized_patients(${inst}) where expires_at <= now() + interval '72 hours'`;
    const notifications = await tx`select id, title, body, link, severity, created_at, read_at from notifications where user_id = ${userId} order by created_at desc limit 5`;
    return { d, pending, submissions, activity, expiring, notifications };
  });
}

export async function institutionDetail(userId: string, inst: string) {
  return withActor(userId, async (tx) => {
    const [i] = await tx`select * from healthcare_institutions where id = ${inst}`;
    const docs = await tx`select id, document_type, file_name, size_bytes, created_at from institution_documents where institution_id = ${inst} order by created_at`;
    return { i, docs };
  });
}
