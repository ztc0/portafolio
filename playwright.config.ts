import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  preserveOutput: "always",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command:
      "corepack pnpm exec astro build && corepack pnpm exec astro preview --host 127.0.0.1 --port 4321",
    reuseExistingServer: false,
    timeout: 120_000,
    url: "http://127.0.0.1:4321/en/",
  },
});
