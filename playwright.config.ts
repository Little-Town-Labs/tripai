import { defineConfig, devices } from "@playwright/test";

const e2ePort = process.env.TRIPAI_E2E_PORT ?? "3100";
const e2eBaseUrl = `http://localhost:${e2ePort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 5"],
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --hostname localhost --port ${e2ePort}`,
    env: {
      ...process.env,
      TRIPAI_E2E_AUTH_BYPASS: "1",
    },
    url: e2eBaseUrl,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
