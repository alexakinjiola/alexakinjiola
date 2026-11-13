/** Automated WCAG 2.2 A/AA checks (axe-core) on key screens. Automated checks catch ~30–40% of issues; manual testing with screen readers is still required. */
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { generate } from "otplib";

const PASSWORD = "Demo-Password-2026";
async function signIn(page: Page, email: string, totp?: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  if (totp) { await page.waitForURL(/mfa/); await page.getByLabel("6-digit code").fill(await generate({ secret: totp })); await page.getByRole("button", { name: /verify/i }).click(); }
  await page.waitForURL((u) => !/sign-in|auth\/mfa/.test(u.pathname));
}
async function audit(page: Page, path: string) {
  // Entrance animations are disabled under reduced motion; otherwise axe samples mid-fade opacity.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const summary = r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  expect(summary, `${path}\n${summary.join("\n")}`).toEqual([]);
}

test("public pages", async ({ page }) => { for (const p of ["/", "/sign-in", "/register", "/register/provider", "/forgot-password", "/privacy"]) await audit(page, p); });
test("patient app", async ({ page }) => {
  await signIn(page, "adaeze@demo.continuum.test");
  for (const p of ["/dashboard", "/records", "/records/upload", "/timeline", "/access", "/access?tab=active", "/activity", "/notifications", "/settings", "/settings/security", "/settings/notifications", "/support"]) await audit(page, p);
});
test("provider workspace", async ({ page }) => {
  await signIn(page, "dr.adeyemi@demo.continuum.test", "MFRGGZDFMZTWQ2LKMFRGGZDFMZTWQ2LK");
  for (const p of ["/provider", "/provider/search", "/provider/requests", "/provider/patients", "/provider/submit", "/provider/submissions"]) await audit(page, p);
});
test("admin console", async ({ page }) => {
  await signIn(page, "admin@demo.continuum.test", "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP");
  for (const p of ["/admin", "/admin/institutions", "/admin/professionals", "/admin/patients", "/admin/security", "/admin/audit", "/admin/support", "/admin/settings"]) await audit(page, p);
});
