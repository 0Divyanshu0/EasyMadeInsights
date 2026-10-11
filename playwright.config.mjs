import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  forbidOnly: Boolean(process.env.CI),
  timeout: 30000,
  workers: 1,
  outputDir: "test-results/tools",
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/tools" }]],
  use: {
    baseURL: "http://127.0.0.1:5190",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    { command: "npm run dev:ui -- --host 127.0.0.1 --port 5190 --strictPort", url: "http://127.0.0.1:5190", reuseExistingServer: !process.env.CI },
    { command: "node server.mjs", env: { PORT: "8791" }, url: "http://127.0.0.1:8791/api/health", reuseExistingServer: false },
  ],
});
