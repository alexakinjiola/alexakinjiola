/**
 * End-to-end flows A–I from the brief, run in a real browser against a
 * freshly reset + seeded database (see e2e/README in docs/TESTING.md).
 * Selectors use roles and labels, so they double as an accessibility check.
 */
import { test, expect, type Page } from "@playwright/test";
import postgres from "postgres";
import { generate } from "otplib";
import { loadEnv } from "../scripts/env";

loadEnv();
const db = postgres(process.env.DATABASE_ADMIN_URL!, { max: 1, onnotice: () => {} });
const PASSWORD = "Demo-Password-2026";
const TOTP = { clinician: "KRSXG5CTMVRXEZLUKRSXG5CTMVRXEZLU", clinician2: "MFRGGZDFMZTWQ2LKMFRGGZDFMZTWQ2LK", admin: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP" };

test.describe.configure({ mode: "serial" });
test.afterAll(async () => { await db.end(); });

async function signIn(page: Page, email: string, totp?: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  if (totp) {
    await page.waitForURL(/\/auth\/mfa/);
    await page.getByLabel("6-digit code").fill(await generate({ secret: totp }));
    await page.getByRole("button", { name: /verify and continue/i }).click();
  }
  await page.waitForURL((u) => !/sign-in|auth\/mfa/.test(u.pathname));
}

async function latestMailLink(to: string, path: string) {
  const [m] = await db`select body from message_outbox where recipient = ${to} and body like ${`%${path}%`} order by created_at desc limit 1`;
  return new URL(m.body.match(/https?:\/\/\S+/)[0]).pathname;
}

const healthId = async (name: string) =>
  (await db`select h.value from health_identifiers h join patient_profiles p on p.patient_id = h.patient_id
            where p.full_name = ${name} and h.identifier_type = 'platform_hid'`)[0].value as string;

test("A + B: patient registers, verifies, uploads a record that appears on the timeline", async ({ page }) => {
  const email = `new.patient.${Date.now()}@example.test`;
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Chiamaka Eze-Test");
  await page.getByLabel("Date of birth").fill("1993-07-19");
  await page.getByLabel("Sex").selectOption("female");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Phone number").fill(`080${String(Date.now()).slice(-8)}`);
  await page.getByLabel("Create a password").fill("Correct-Horse-42");
  await page.getByLabel("Confirm password").fill("Correct-Horse-42");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/verify-email/);
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();

  await page.goto(await latestMailLink(email, "/verify-email/"));
  await expect(page.getByRole("heading", { name: "Email confirmed" })).toBeVisible();
  await page.getByRole("link", { name: "Continue" }).click();
  await page.waitForURL(/onboarding\/identity/);
  await page.getByRole("textbox", { name: "NIN" }).fill("12345678901"); // sandbox: ends in 1 → verified
  await page.getByRole("checkbox", { name: /I agree/ }).check();
  await page.getByRole("button", { name: "Verify my identity" }).click();
  await expect(page.getByText("Identity verified")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/dashboard/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Chiamaka");

  // Flow B — upload
  await page.goto("/records/upload");
  await page.locator("input[type=file]").setInputFiles({ name: "malaria-test.pdf", mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF") });
  await page.getByLabel("Category").selectOption("lab_result");
  await page.getByLabel("Title").fill("Malaria rapid test");
  await page.getByLabel("Date of the test or visit").fill("2024-02-10");
  await page.getByRole("button", { name: "Upload securely" }).click();
  await expect(page.getByRole("heading", { name: "Uploaded and stored securely" })).toBeVisible();
  await page.goto("/timeline");
  await expect(page.getByText("Malaria rapid test")).toBeVisible();
  await expect(page.getByText("Uploaded by patient").first()).toBeVisible();

  // A disguised executable is rejected by content sniffing.
  await page.goto("/records/upload");
  await page.locator("input[type=file]").setInputFiles({ name: "evil.pdf", mimeType: "application/pdf", buffer: Buffer.from("MZ\x90\x00 not a pdf") });
  await page.getByLabel("Category").selectOption("other");
  await page.getByLabel("Title").fill("Should fail");
  await page.getByRole("button", { name: "Upload securely" }).click();
  await expect(page.getByText("Only PDF, JPG and PNG files can be uploaded.").first()).toBeVisible();
});

test("D + E + G + H: provider requests, patient approves, provider views, patient revokes, access ends", async ({ page }) => {
  const hid = await healthId("Emeka Nwosu");
  await signIn(page, "dr.eze@demo.continuum.test", TOTP.clinician);
  await page.goto("/provider/search");
  await page.getByRole("textbox", { name: "Health ID" }).fill(hid);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText("Emeka N.")).toBeVisible();
  await expect(page.getByText("Type 2 diabetes")).toHaveCount(0); // no clinical data in search
  await page.getByRole("link", { name: "Request access" }).click();
  await page.getByLabel("Purpose of access").selectOption("follow_up");
  await page.getByLabel("Clinical reason").fill("Reviewing diabetes medicines before adjusting the dose.");
  await page.getByText("Diagnoses", { exact: true }).click();
  await page.getByText("Prescriptions", { exact: true }).click();
  await page.getByRole("button", { name: "Send request to patient" }).click();
  await page.waitForURL(/provider\/requests/);
  const patientId = (await db`select id from patients where id = (select patient_id from patient_profiles where full_name = 'Emeka Nwosu')`)[0].id;
  // Pending request grants nothing.
  await page.goto(`/provider/patients/${patientId}`);
  await expect(page.getByText("You don't have access to this patient's records")).toBeVisible();

  // Patient approves.
  await signIn(page, "emeka@demo.continuum.test");
  await page.goto("/access");
  await page.getByRole("link", { name: "Review and decide" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ikeja Specialist Hospital");
  await page.getByLabel(/I understand what will be shared/).check();
  await page.getByRole("button", { name: "Approve request" }).click();
  await page.waitForURL(/access\/permissions\//);
  const permissionUrl = page.url();

  // Provider can now see exactly the approved records.
  await signIn(page, "dr.eze@demo.continuum.test", TOTP.clinician);
  await page.goto(`/provider/patients/${patientId}`);
  await expect(page.getByRole("heading", { name: "Emeka Nwosu" })).toBeVisible();
  await expect(page.getByText("Metformin 500 mg")).toBeVisible();

  // Patient revokes (Flow G).
  const provider = page;
  const patientCtx = await page.context().browser()!.newContext();
  const patientPage = await patientCtx.newPage();
  await signIn(patientPage, "emeka@demo.continuum.test");
  await patientPage.goto(permissionUrl);
  await patientPage.getByRole("button", { name: "Revoke access" }).click();
  await patientPage.getByRole("dialog").getByRole("button", { name: "Revoke access" }).click();
  await expect(patientPage.getByText(/Access revoked/).first()).toBeVisible();

  // The provider's open screen locks on its next check; a fresh load is denied.
  await provider.reload();
  await expect(provider.getByText("You don't have access to this patient's records")).toBeVisible();

  // Flow H — the patient sees views and the blocked attempt, and can report.
  await patientPage.goto("/activity");
  await expect(patientPage.getByText(/Dr Chidi Eze at Ikeja Specialist Hospital \(Demo\) (viewed|opened)/).first()).toBeVisible();
  await expect(patientPage.getByText(/tried to access your information and was blocked/).first()).toBeVisible();
  await patientPage.getByRole("button", { name: "Report suspicious activity" }).first().click();
  await patientPage.getByLabel("What looks wrong?").fill("I don't recognise this access attempt.");
  await patientPage.getByRole("button", { name: "Send report" }).click();
  await expect(patientPage.getByText(/Report sent/).first()).toBeVisible();
  const [inc] = await db`select count(*)::int n from security_incidents where category = 'patient_report'`;
  expect(inc.n).toBeGreaterThan(0);
  await patientCtx.close();
});

test("E (partial) + F: patient partly approves one request and declines another", async ({ page }) => {
  await signIn(page, "adaeze@demo.continuum.test");
  await page.goto("/access");
  await page.getByRole("link", { name: "Review and decide" }).first().click();
  await page.getByText("Share only some of it").click();
  await page.getByLabel("Laboratory results", { exact: false }).first().uncheck();
  await page.getByLabel(/I understand what will be shared/).check();
  await page.getByRole("button", { name: "Approve selected access" }).click();
  await page.waitForURL(/access\/permissions\//);
  await expect(page.getByText("Laboratory results")).toHaveCount(0);

  // Flow F — a new request is declined.
  const [ada] = await db`select patient_id from patient_profiles where full_name = 'Adaeze Okafor'`;
  const [lab] = await db`select id from healthcare_institutions where name like 'Meridian%'`;
  const [bisi] = await db`select user_id from healthcare_professionals where full_name = 'Bisi Ogun'`;
  await db.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: bisi.user_id })}, true)`;
    await tx`select app.create_access_request(${lab.id}, ${ada.patient_id}, 'diagnostic_review', 'Comparing a new cholesterol test with the old one.', array['lab_result'], null, null, 7)`;
  });
  await page.goto("/access");
  await page.getByRole("link", { name: "Review and decide" }).first().click();
  await page.getByRole("button", { name: "Decline" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Decline request" }).click();
  await page.waitForURL(/access\?tab=pending/);
  const [r] = await db`select status from access_requests where institution_id = ${lab.id} order by created_at desc limit 1`;
  expect(r.status).toBe("rejected");
  const [p] = await db`select count(*)::int n from permissions where institution_id = ${lab.id} and status = 'active'`;
  expect(p.n).toBe(0);
});

test("I: provider submits a clinical record with provenance; patient is notified", async ({ page }) => {
  const hid = await healthId("Adaeze Okafor");
  await signIn(page, "dr.adeyemi@demo.continuum.test", TOTP.clinician2);
  await page.goto("/provider/submit");
  await page.getByRole("textbox", { name: "Health ID" }).fill(hid);
  await page.getByRole("button", { name: "Search" }).click();
  const results = page.getByRole("region", { name: "Search results" });
  await expect(results.getByText("Adaeze O.")).toBeVisible();
  await results.getByRole("link", { name: "Submit a record" }).click();
  await page.getByLabel("Category").selectOption("consultation");
  await page.getByLabel("Clinical date").fill(new Date().toISOString().slice(0, 10));
  await page.getByLabel("Title", { exact: true }).fill("Hypertension review clinic");
  await page.getByLabel("Clinical notes").fill("BP 138/86 on amlodipine. Continue current dose.");
  await page.getByRole("button", { name: "Submit record" }).click();
  await expect(page.getByRole("heading", { name: "Record submitted" })).toBeVisible();

  await signIn(page, "adaeze@demo.continuum.test");
  await page.goto("/records?q=Hypertension+review");
  await expect(page.getByText("Hypertension review clinic")).toBeVisible();
  await expect(page.locator("main ul").getByText("Verified institution").first()).toBeVisible();
  await page.goto("/notifications");
  await expect(page.getByText("New record added to your health history").first()).toBeVisible();
});

test("C: institution registers, is approved by an admin, and unlocks provider functions", async ({ page }) => {
  const email = `director.${Date.now()}@example.test`;
  await page.context().clearCookies();
  await page.goto("/register/provider");
  await page.getByLabel("Your full name").fill("Kunle Adebayo");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Phone number").fill(`070${String(Date.now()).slice(-8)}`);
  await page.getByLabel("Password", { exact: true }).fill("Clinic-Secure-2026");
  await page.getByLabel("Confirm password").fill("Clinic-Secure-2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create provider account" }).click();
  await page.waitForURL(/verify-email/);
  await page.goto(await latestMailLink(email, "/verify-email/"));
  await page.getByRole("link", { name: "Continue" }).click();
  await page.waitForURL(/auth\/mfa\/setup/);
  await page.getByRole("button", { name: "Show my setup code" }).click();
  const secret = (await page.locator("code").innerText()).replace(/\s/g, "");
  await page.getByLabel("6-digit code").fill(await generate({ secret }));
  await page.getByRole("button", { name: "Turn on two-step verification" }).click();
  await page.waitForURL(/provider/);

  await page.goto("/provider/institution/new");
  await page.getByLabel("Registered name").fill("Unity Medical Centre (E2E)");
  await page.getByLabel("Type").selectOption("clinic");
  await page.getByLabel("Registration number").fill(`RC-${Date.now()}`);
  await page.getByLabel("Operating licence number").fill("LSMOH-2026-4410");
  await page.getByLabel("Licensing authority").fill("Lagos State Ministry of Health");
  await page.getByLabel("Street address").fill("12 Allen Avenue");
  await page.getByLabel("City or town").fill("Ikeja");
  await page.getByLabel("State").selectOption("Lagos");
  await page.getByLabel("General email").fill("info@unity.example.test");
  await page.getByLabel("General phone").fill("08031234567");
  await page.getByLabel("Job title").fill("Medical Director");
  await page.getByRole("button", { name: "Create institution" }).click();
  await page.waitForURL(/provider\/institution$/);
  await page.locator("input[type=file]").setInputFiles({ name: "licence.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") });
  await page.getByRole("button", { name: "Upload document" }).click();
  await expect(page.getByText("Operating licence", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Submit for verification" }).click();
  await expect(page.getByText(/Submitted/).first()).toBeVisible();

  // Admin approves (with step-up code).
  await signIn(page, "admin@demo.continuum.test", TOTP.admin);
  await page.goto("/admin/institutions");
  await page.getByRole("row", { name: /Unity Medical Centre/ }).getByRole("link", { name: "Review" }).click();
  await page.getByRole("button", { name: "Approve" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Confirm it's you/).fill(await generate({ secret: TOTP.admin }));
  await dialog.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Verified").first()).toBeVisible();

  // Admin console never exposes clinical records.
  await page.goto("/admin/patients");
  await expect(page.getByText("Lipid profile")).toHaveCount(0);
});

test("15. direct API calls cannot bypass the UI", async ({ page, request }) => {
  const [att] = await db`select a.id from medical_record_attachments a join medical_records r on r.id = a.record_id
                         join patient_profiles p on p.patient_id = r.patient_id where p.full_name = 'Adaeze Okafor' limit 1`;
  expect((await request.get(`/api/files/${att.id}`)).status()).toBe(401);
  await signIn(page, "emeka@demo.continuum.test");
  expect((await page.request.get(`/api/files/${att.id}`)).status()).toBe(404);
  const [inst] = await db`select id from healthcare_institutions where name like 'Meridian%'`;
  await signIn(page, "dr.eze@demo.continuum.test", TOTP.clinician);
  expect((await page.request.get(`/api/files/${att.id}?institution=${inst.id}`)).status()).toBe(403);
  const csrf = await page.request.post("/api/records/upload", { headers: { origin: "https://evil.example" }, multipart: { title: "x" } });
  expect(csrf.status()).toBe(403);
});
