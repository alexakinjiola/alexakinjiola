/** Phone layouts: no sideways scrolling, bottom navigation, drawer, and the key decision flow on a small screen. */
import { test, expect, type Page } from "@playwright/test";
import { ensurePendingRequestForAdaeze } from "./support";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Demo-Password-2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !/sign-in/.test(u.pathname));
}
async function noHorizontalScroll(page: Page, path: string) {
  await page.goto(path);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${path} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(1);
}

test("public and patient pages fit the screen", async ({ page }) => {
  for (const p of ["/", "/sign-in", "/register"]) await noHorizontalScroll(page, p);
  await signIn(page, "adaeze@demo.continuum.test");
  for (const p of ["/dashboard", "/records", "/timeline", "/access", "/activity", "/notifications", "/settings", "/settings/security", "/records/upload", "/records/export"]) {
    await noHorizontalScroll(page, p);
  }
});

test("bottom navigation and menu drawer work", async ({ page }) => {
  await signIn(page, "adaeze@demo.continuum.test");
  const nav = page.getByRole("navigation", { name: "Main" }).last();
  await nav.getByRole("link", { name: "Access" }).click();
  await expect(page).toHaveURL(/\/access/);
  await expect(nav.getByRole("link", { name: "Access" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Health timeline" }).click();
  await expect(page).toHaveURL(/\/timeline/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("a patient can review and decline a request on a phone, with tap targets ≥ 44px", async ({ page }) => {
  await ensurePendingRequestForAdaeze();
  await signIn(page, "adaeze@demo.continuum.test");
  await page.goto("/access");
  await page.getByRole("link", { name: "Review and decide" }).first().click();
  // Who is asking must be visible before the decision controls on small screens.
  const who = await page.getByRole("heading", { name: "Who is asking" }).boundingBox();
  const decide = await page.getByRole("heading", { name: "Your decision" }).boundingBox();
  expect(who!.y).toBeLessThan(decide!.y);
  for (const name of ["Decline", "Approve request"]) {
    const box = await page.getByRole("button", { name }).boundingBox();
    expect(box!.height, `${name} button height`).toBeGreaterThanOrEqual(44);
  }
});
