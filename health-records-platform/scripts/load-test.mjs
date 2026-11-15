/**
 * Local load test against the PRD §8.3 targets. Run against a seeded instance:
 *   E2E_BASE_URL=http://localhost:3000 node scripts/load-test.mjs
 * Results describe THIS machine only; repeat on production-like infrastructure
 * (same region, managed Postgres, realistic data volume) before the pilot.
 */
import autocannon from "autocannon";
import postgres from "postgres";
import { chromium } from "@playwright/test";
import { generate } from "otplib";
import { readFileSync } from "node:fs";

for (const l of readFileSync(".env.local", "utf8").split("\n")) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});

async function cookieFor(email, totp) {
  const ctx = await browser.newContext(); const p = await ctx.newPage();
  await p.goto(`${BASE}/sign-in`);
  await p.getByLabel("Email address").fill(email);
  await p.getByLabel("Password", { exact: true }).fill("Demo-Password-2026");
  await p.getByRole("button", { name: "Sign in" }).click();
  if (totp) { await p.waitForURL(/mfa/); await p.getByLabel("6-digit code").fill(await generate({ secret: totp })); await p.getByRole("button", { name: /verify/i }).click(); }
  await p.waitForURL((u) => !/sign-in|mfa/.test(u.pathname));
  const c = (await ctx.cookies()).map((x) => `${x.name}=${x.value}`).join("; ");
  await ctx.close(); return c;
}

const patient = await cookieFor("adaeze@demo.continuum.test");
const results = [];
async function run(name, path, cookie, targetMs, connections = 10, duration = 15) {
  const r = await autocannon({ url: `${BASE}${path}`, connections, duration, headers: { cookie } });
  const row = { scenario: name, connections, requests: r.requests.total, rps: Math.round(r.requests.average), p50_ms: r.latency.p50,
    p95_ms: r.latency.p90 ?? r.latency.p97_5, p99_ms: r.latency.p99, errors: r.errors + r.non2xx, target_ms: targetMs };
  row.meets_target = row.p99_ms <= targetMs && row.errors === 0;
  results.push(row); console.log(JSON.stringify(row));
}
await run("Patient dashboard", "/dashboard", patient, 3000);
await run("Record list", "/records", patient, 2000);
await run("Activity history", "/activity", patient, 2000);
await run("Health check (baseline)", "/api/health", "", 500, 50, 10);

// Access request creation + revocation effectiveness, measured at the database layer the UI calls.
const sql = postgres(process.env.DATABASE_ADMIN_URL, { max: 1, onnotice: () => {} });
const as = (uid, q) => sql.begin(async (tx) => { await tx`select set_config('role','authenticated',true), set_config('request.jwt.claims', ${JSON.stringify({ sub: uid })}, true)`; return q(tx); });
const [{ eze, inst }] = await sql`select hp.user_id as eze, a.institution_id as inst from healthcare_professionals hp join professional_affiliations a on a.professional_id = hp.id where hp.full_name = 'Dr Chidi Eze'`;
const [{ emeka, emeka_uid }] = await sql`select pt.id as emeka, pt.user_id as emeka_uid from patients pt join patient_profiles pp on pp.patient_id = pt.id where pp.full_name = 'Emeka Nwosu'`;
const [{ rec }] = await sql`select id as rec from medical_records where patient_id = ${emeka} and category_key = 'diagnosis' limit 1`;
const create = [], revokeToDenied = [];
for (let i = 0; i < 20; i++) {
  await sql`update access_requests set status = 'cancelled' where patient_id = ${emeka} and institution_id = ${inst} and status = 'pending'`;
  let t = performance.now();
  const [{ id }] = await as(eze, (tx) => tx`select app.create_access_request(${inst}, ${emeka}, 'follow_up', 'Load test: diabetes review', array['diagnosis'], null, null, 7) as id`);
  create.push(performance.now() - t);
  const [{ p }] = await as(emeka_uid, (tx) => tx`select app.decide_access_request(${id}, 'approve') as p`);
  t = performance.now();
  await as(emeka_uid, (tx) => tx`select app.revoke_permission(${p}, 'load test')`);
  const [{ r }] = await as(eze, (tx) => tx`select app.provider_get_record(${inst}, ${rec}) as r`);
  if (r.allowed) throw new Error("Revocation was not effective immediately");
  revokeToDenied.push(performance.now() - t);
}
const pct = (a, q) => Math.round([...a].sort((x, y) => x - y)[Math.floor(q * (a.length - 1))]);
const extra = [
  { scenario: "Access request creation (DB function)", samples: 20, p50_ms: pct(create, 0.5), p99_ms: pct(create, 0.99), target_ms: 3000 },
  { scenario: "Revocation → next read denied", samples: 20, p50_ms: pct(revokeToDenied, 0.5), p99_ms: pct(revokeToDenied, 0.99), target_ms: 5000 },
].map((x) => ({ ...x, meets_target: x.p99_ms <= x.target_ms }));
extra.forEach((x) => console.log(JSON.stringify(x)));
await sql.end(); await browser.close();
const all = [...results, ...extra];
console.log(`\n${all.every((r) => r.meets_target) ? "ALL TARGETS MET" : "SOME TARGETS MISSED"} on this machine.`);
process.env.LOAD_REPORT && (await import("node:fs")).writeFileSync(process.env.LOAD_REPORT, JSON.stringify({ at: new Date().toISOString(), base: BASE, results: all }, null, 2));
