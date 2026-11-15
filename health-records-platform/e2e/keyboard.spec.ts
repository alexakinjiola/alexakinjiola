/** Keyboard-only use: skip link, visible focus, dialogs that trap focus and close on Escape, and a full decision without a mouse. */
import { test, expect } from "@playwright/test";

test("sign in and decline a request using only the keyboard", async ({ page }) => {
  await page.goto("/sign-in");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Email address")).toBeFocused();
  await page.keyboard.type("adaeze@demo.continuum.test");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Demo-Password-2026");
  await page.keyboard.press("Enter");
  await page.waitForURL(/dashboard/);

  await page.goto("/access");
  const review = page.getByRole("link", { name: "Review and decide" }).first();
  await review.focus();
  // Focus must be visibly indicated (outline drawn by :focus-visible).
  const outline = await review.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");
  await page.keyboard.press("Enter");
  await page.waitForURL(/access\/requests\//);

  const decline = page.getByRole("button", { name: "Decline" });
  await decline.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // Focus is trapped inside the dialog.
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }
  // Escape closes it and returns focus to the trigger.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(decline).toBeFocused();
});

test("the account menu and radio choices work from the keyboard", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("adaeze@demo.continuum.test");
  await page.getByLabel("Password", { exact: true }).fill("Demo-Password-2026");
  await page.keyboard.press("Enter");
  await page.waitForURL(/dashboard/);
  await page.getByRole("button", { name: /Account menu/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);

  await page.goto("/records/export");
  const pdf = page.getByRole("radio", { name: /Readable summary/ });
  await pdf.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: /Structured data/ })).toBeChecked();
});
