import { NextResponse, type NextRequest } from "next/server";
import { withService } from "@/lib/db";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";

/** Scheduled job: expire permissions/requests and send expiry warnings. Call every 5–15 minutes. */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${env().CRON_SECRET}`)) return NextResponse.json({ ok: false }, { status: 401 });
  const [{ r }] = await withService((tx) => tx`select app.run_expiry() as r`);
  return NextResponse.json({ ok: true, ...r });
}
