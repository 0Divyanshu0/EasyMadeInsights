import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/smoke",
  forbidOnly: Boolean(process.env.CI),
  timeout: 30000,
  workers: 1,
  outputDir: "test-results/smoke",
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/smoke" }]],
  use: {
    baseURL: "http://127.0.0.1:5192",
    headless: true,
    colorScheme: "light",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 5192 --strictPort",
    url: "http://127.0.0.1:5192",
    reuseExistingServer: !process.env.CI,
  },
});
