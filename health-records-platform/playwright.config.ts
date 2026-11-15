import { defineConfig, devices } from "@playwright/test";

const chromiumPath = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", trace: "off" },
  projects: [
    { name: "desktop", testIgnore: /mobile\.spec/, use: { ...devices["Desktop Chrome"], launchOptions: chromiumPath } },
    // Phones common in Nigeria: a mid-range Android and a small iPhone viewport (rendered with Chromium).
    { name: "android", testMatch: /mobile\.spec/, use: { ...devices["Pixel 7"], launchOptions: chromiumPath } },
    { name: "small-iphone", testMatch: /mobile\.spec/, use: { ...devices["iPhone SE"], browserName: "chromium", launchOptions: chromiumPath } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "pnpm start", url: "http://localhost:3000/api/health", reuseExistingServer: true, timeout: 120_000 },
});
