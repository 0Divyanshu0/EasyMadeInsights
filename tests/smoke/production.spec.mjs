import { test, expect } from "@playwright/test";
import * as XLSX from "xlsx";

async function dismissWelcome(page) {
  const welcome = page.getByRole("button", { name: "Enter Dashboard", exact: true });
  if (await welcome.isVisible()) await welcome.click();
  await expect(page.locator(".welcome-overlay")).toHaveCount(0);
}

test("built dashboard parses sheets, updates reporting controls, and resets", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Upload a spreadsheet and bend the report to fit the question." })).toBeVisible();
  await dismissWelcome(page);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
    { Region: "North", Revenue: 1200, Units: 12 },
    { Region: "South", Revenue: 900, Units: 9 },
  ]), "Sales");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
    { Team: "Support", Tickets: 4 },
  ]), "Operations");
  await page.locator(".upload-box input").setInputFiles({
    name: "smoke.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
  });
  await expect(page.locator(".status-banner")).toContainText("2 sheet(s) ready");
  const measure = page.locator(".kpi-card").filter({ hasText: "Revenue Total" });
  await expect(measure.locator(".kpi-value")).toHaveText("$2,100");
  await expect(page.locator(".preview-table tbody tr")).toHaveCount(2);
  await page.getByLabel("Metric", { exact: true }).selectOption("Units");
  await expect(page.locator(".kpi-card").filter({ hasText: "Units Total" }).locator(".kpi-value")).toHaveText("21");
  await page.getByLabel("Performance Chart", { exact: true }).selectOption("pie");
  await page.getByLabel("Trend Chart", { exact: true }).selectOption("line");
  await expect(page.locator(".recharts-pie")).not.toHaveCount(0);
  await page.getByLabel("Select Sheet:").selectOption("Operations");
  await expect(page.getByLabel("Metric", { exact: true })).toHaveValue("Tickets");
  await expect(page.locator(".kpi-card").filter({ hasText: "Tickets Total" }).locator(".kpi-value")).toHaveText("4");
  await expect(page.locator(".takeaways")).toContainText("Local analysis");
  await expect(page.locator(".takeaways")).toContainText("Tickets total");
  await expect(page.getByRole("button", { name: "See Upcoming Status" })).toHaveCount(0);
  await page.getByRole("button", { name: "Reset Dashboard" }).click();
  await expect(page.locator(".preview-table")).toHaveCount(0);
  await expect(page.getByLabel("Select Sheet:")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("built routes, theme persistence, logos, and public demo assets work", async ({ page, request }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await dismissWelcome(page);
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await dismissWelcome(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("/conversions");
  await expect(page.getByRole("heading", { name: "EasyMadeConversions", exact: true })).toBeVisible();
  await expect(page.locator(".welcome-overlay")).toHaveCount(0);
  await page.getByPlaceholder("Search tools...").fill("JWT");
  await expect(page.locator(".tool-card")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "JWT Decoder", exact: true })).toBeVisible();
  await page.goto("/unknown-smoke-route");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  for (const asset of ["/easy-made-insights-logo.png", "/EasyMadeConversion_logo.png", "/easy-made-insights-demo.xlsx", "/easy-made-insights-demo.pdf"]) {
    const response = await request.get(asset);
    expect(response.ok(), asset).toBeTruthy();
    expect(response.headers()["content-type"], asset).not.toContain("text/html");
    expect((await response.body()).length, asset).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});
