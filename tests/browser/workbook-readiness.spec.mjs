import { test, expect } from "@playwright/test";
import * as XLSX from "xlsx";
import { assessNumericReadiness } from "../../src/utils/numericReadiness.js";
import { analyzeSheet, cleanRows } from "../../src/utils/workbook.js";

const cases = [
  { name: "text-only sheets", rows: [{ Name: "Avery", Notes: "Review the draft" }, { Name: "Riley", Notes: "Waiting for approval" }], reason: "no-numeric-values" },
  { name: "digits embedded in labels", rows: [{ Label: "Group 11", Notes: "Chapter 42" }], reason: "no-numeric-values" },
  { name: "numeric identifiers with camel-case headers", rows: [{ customerID: 1001, phoneNumber: 1234567890 }, { customerID: 1002, phoneNumber: 1234567891 }], reason: "context-only-numbers" },
  { name: "year and date context without measurements", rows: [{ Year: 2026, OrderNo: 1, SubmittedDate: new Date("2026-10-01") }], reason: "context-only-numbers" },
  { name: "sparse numbers with otherwise populated rows", rows: [{ Name: "A", Amount: 5 }, { Name: "B", Amount: "" }, { Name: "C", Amount: "" }], reason: "sparse-numeric-values" },
  { name: "numbers mixed with descriptive text", rows: [{ Value: 10 }, { Value: "Pending" }, { Value: "Unknown" }, { Value: 20 }], reason: "sparse-numeric-values" },
  { name: "empty and whitespace-only rows", rows: [{ Notes: "  " }, { Notes: null }], reason: "empty-sheet" },
  { name: "wide text-heavy reports with one useful measure", rows: [{ Name: "A", Notes: "Long description", Team: "Support", Status: "Open", Region: "North", Owner: "Alex", Revenue: 1200 }], reason: null },
  { name: "non-financial numeric reports", rows: [{ Sensor: "A", Temperature: 22.5 }, { Sensor: "B", Temperature: 19.2 }], reason: null },
  { name: "zero, negative, and constant measures", rows: [{ Team: "A", Score: 0 }, { Team: "B", Score: -2 }, { Team: "C", Score: -2 }], reason: null },
  { name: "currency and percentage strings", rows: [{ Revenue: "$1,200.50", Rate: "35%" }, { Revenue: "($200.50)", Rate: "0%" }], reason: null },
  { name: "identifiers alongside a useful measurement", rows: [{ SKU: 1001, OrderID: 201, Units: 5 }], reason: null },
  { name: "duration and count headers", rows: [{ DaysToClose: 3, ProcessingTime: 60, CategoryCount: 4 }], reason: null },
  { name: "numbers present in half of populated rows", rows: [{ Name: "A", Value: 5 }, { Name: "B", Value: "" }], reason: null },
  { name: "80 percent numeric consistency", rows: [1, 2, 3, 4, "Pending"].map((Value) => ({ Value })), reason: null },
];

for (const { name, rows, reason } of cases) {
  test(`readiness assessment: ${name}`, () => {
    const before = structuredClone(rows);
    const assessment = assessNumericReadiness(rows);
    expect(assessment.warning?.reason ?? null).toBe(reason);
    expect(rows).toEqual(before);
  });
}

test("advisory assessment leaves existing cleaning and analysis outputs unchanged", () => {
  const rows = [{ Region: "North", Revenue: 100, Units: 2 }, { Region: "South", Revenue: "", Units: 3 }, { Region: "North", Revenue: 100, Units: 2 }];
  const baseline = analyzeSheet("Sales", cleanRows(structuredClone(rows)));
  rows.forEach(Object.freeze);
  Object.freeze(rows);
  const assessment = assessNumericReadiness(rows);
  const result = analyzeSheet("Sales", cleanRows(structuredClone(rows)));
  expect(assessment.warning).toBeNull();
  expect(result).toEqual(baseline);
  expect(result.metricSummary.total).toBe(200);
  expect(result.rowCount).toBe(2);
});

async function openDashboard(page, theme = "light") {
  await page.addInitScript((value) => localStorage.setItem("easy-made-insights-theme", value), theme);
  await page.goto("/");
  const welcome = page.locator(".welcome-overlay button");
  if (await welcome.isVisible()) await welcome.click();
  await expect(page.locator(".welcome-overlay")).toHaveCount(0);
}

async function upload(page, sheets, name = "readiness.xlsx") {
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name);
  await page.locator(".upload-box input").setInputFiles({ name, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) });
  await expect(page.locator(".status-banner.success")).toContainText("sheet(s) ready");
}

test("textual XLSX imports normally with a dismissible non-blocking warning", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openDashboard(page);
  await upload(page, { Notes: [{ Topic: "Planning", Notes: "Review the draft" }, { Topic: "Launch", Notes: "Check wording" }] });
  const notice = page.locator(".numeric-readiness-notice");
  await expect(notice).toContainText("Limited numeric insights");
  await expect(notice).toContainText("Your file is still imported");
  await expect(notice).toHaveAttribute("role", "status");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".preview-table tbody tr")).toHaveCount(2);
  await page.getByRole("button", { name: "Open full sheet preview" }).click();
  await expect(page.getByRole("dialog").locator("tbody")).toContainText("Check wording");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Dismiss numeric insight warning" }).click();
  await expect(notice).toHaveCount(0);
  await expect(page.locator(".preview-table tbody tr")).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("warnings follow the active worksheet and dismissals reset for replacement uploads", async ({ page }) => {
  await openDashboard(page);
  const sheets = { Notes: [{ Topic: "Launch", Notes: "Review wording" }], Sales: [{ Region: "North", Revenue: 1200 }, { Region: "South", Revenue: 900 }] };
  await upload(page, sheets);
  const notice = page.locator(".numeric-readiness-notice");
  await expect(notice).toContainText("Notes");
  await page.getByLabel("Select Sheet:").selectOption("Sales");
  await expect(notice).toHaveCount(0);
  await expect(page.locator(".kpi-card").filter({ hasText: "Revenue Total" }).locator(".kpi-value")).toHaveText("$2,100");
  await page.getByLabel("Select Sheet:").selectOption("Notes");
  await expect(notice).toBeVisible();
  await page.getByRole("button", { name: "Dismiss numeric insight warning" }).click();
  await page.getByLabel("Select Sheet:").selectOption("Sales");
  await page.getByLabel("Select Sheet:").selectOption("Notes");
  await expect(notice).toHaveCount(0);
  await upload(page, { Notes: [{ Topic: "New upload", Notes: "A different file with the same name" }] });
  await expect(notice).toContainText("Limited numeric insights");
  await page.getByRole("button", { name: "Reset Dashboard" }).click();
  await expect(notice).toHaveCount(0);
  await expect(page.locator(".preview-table")).toHaveCount(0);
});

test("raw sparse values trigger an advisory without changing mean-filled analytics", async ({ page }) => {
  await openDashboard(page);
  await upload(page, { Sparse: Array.from({ length: 5 }, (_, index) => ({ Name: `Person ${index}`, Amount: index ? "" : 5 })) });
  await expect(page.locator(".numeric-readiness-notice")).toContainText("sparse or mixed with text");
  await expect(page.locator(".kpi-card").filter({ hasText: "Amount Total" }).locator(".kpi-value")).toHaveText("$25");
  await expect(page.locator(".preview-table tbody tr")).toHaveCount(5);
});

test("identifier-only data warns without removing existing selectable numeric fields", async ({ page }) => {
  await openDashboard(page);
  await upload(page, { Directory: [{ CustomerID: 1001, PhoneNumber: 1234567890, Name: "Avery" }, { CustomerID: 1002, PhoneNumber: 1234567891, Name: "Riley" }] });
  await expect(page.locator(".numeric-readiness-notice")).toContainText("identifiers, dates, or descriptive labels");
  await expect(page.getByLabel("Metric", { exact: true })).toHaveValue("CustomerID");
  await expect(page.locator(".preview-table tbody tr")).toHaveCount(2);
});

test("a wide text-heavy report with a dense measure keeps normal insights without a warning", async ({ page }) => {
  let aiRequests = 0;
  page.on("request", (request) => { if (request.url().includes("/api/ai-insights")) aiRequests += 1; });
  await openDashboard(page);
  await upload(page, { Sales: [{ Name: "Avery", Team: "Support", Description: "Long descriptive text", Status: "Open", Region: "North", Owner: "Alex", Revenue: 1200 },
    { Name: "Riley", Team: "Sales", Description: "Another long description", Status: "Closed", Region: "South", Owner: "Blake", Revenue: 900 }] });
  await expect(page.locator(".numeric-readiness-notice")).toHaveCount(0);
  await expect(page.locator(".kpi-card").filter({ hasText: "Revenue Total" }).locator(".kpi-value")).toHaveText("$2,100");
  await expect(page.locator(".takeaways")).toContainText("Revenue total");
  expect(aiRequests).toBe(0);
});

test("text-only CSV warning remains readable and dismissible on mobile in dark mode", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDashboard(page, "dark");
  await page.locator(".upload-box input").setInputFiles({ name: "notes.csv", mimeType: "text/csv", buffer: Buffer.from("Topic,Notes\nPlanning,Review the draft\nLaunch,Check wording\n") });
  const notice = page.locator(".numeric-readiness-notice");
  await expect(notice).toContainText("Limited numeric insights");
  await notice.scrollIntoViewIfNeeded();
  expect(await notice.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: "test-results/tools/numeric-readiness-mobile-dark.png", animations: "disabled" });
  await page.getByRole("button", { name: "Dismiss numeric insight warning" }).click();
  await expect(notice).toHaveCount(0);
});
