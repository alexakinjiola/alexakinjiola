import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";
import { deliverDue, deliveryConfigFromEnv } from "@/lib/messaging/delivery";

/** Scheduled job: deliver queued emails/SMS. Call every minute with the cron secret. */
export async function POST(req: NextRequest) {
  if (!safeEqual(req.headers.get("authorization") ?? "", `Bearer ${env().CRON_SECRET}`)) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await deliverDue(db(), deliveryConfigFromEnv())) });
}
