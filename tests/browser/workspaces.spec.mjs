import { test, expect } from "@playwright/test";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, PageOrientation } from "docx";
import { jsPDF } from "jspdf";
import { parseNumericValue } from "../../src/utils/workbook.js";

test("numeric parsing preserves formatted measures without extracting digits from labels or dates", () => {
  for (const value of ["Group 11", "2026-10-11", "ID123", "12abc", "1,23", "", "NaN", "Infinity", "1e999"]) expect(parseNumericValue(value), value).toBeNull();
  for (const [value, result] of [["$1,234.50", 1234.5], ["-$1,234.50", -1234.5], ["($1,234.50)", -1234.5], ["USD 10", 10], ["35%", 35], ["2e3", 2000], ["-.5", -.5], [0, 0]]) expect(parseNumericValue(value), String(value)).toBe(result);
});

async function dismissWelcome(page) {
  const welcome = page.locator(".welcome-overlay button");
  if (await welcome.isVisible()) await welcome.click();
  await expect(page.locator(".welcome-overlay")).toHaveCount(0);
}

async function uploadWorkbook(page, rows) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Sales");
  await page.locator(".upload-box input").setInputFiles({ name: "test.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) });
  await expect(page.locator(".status-banner")).toContainText("1 sheet(s) ready");
}

async function openTool(page, name) {
  await page.goto("/conversions");
  await dismissWelcome(page);
  await page.locator(".tool-card").filter({ has: page.getByRole("heading", { name, exact: true }) })
    .getByRole("button", { name: "Use Tool" }).click();
}

test("workspace switches warn, cancel preserves the workbook, and browser Back is guarded", async ({ page }) => {
  await page.goto("/");
  await dismissWelcome(page);
  await uploadWorkbook(page, [{ Region: "North", Revenue: 1200, Units: 12 }]);
  await page.locator(".sidebar").getByRole("button", { name: "Open EasyMadeConversions" }).click();
  const alert = page.getByRole("alertdialog");
  await expect(alert).toContainText("workbook");
  await expect(alert).toContainText("cleared");
  await alert.getByRole("button", { name: "Stay here", exact: true }).click();
  await expect(page.locator(".preview-table tbody tr")).toHaveCount(1);
  await page.locator(".sidebar").getByRole("button", { name: "Open EasyMadeConversions" }).click();
  await alert.getByRole("button", { name: "Switch workspace", exact: true }).click();
  await expect(page).toHaveURL(/\/conversions$/);
  await dismissWelcome(page);
  await expect(page.locator(".sidebar nav button")).toHaveCount(1);
  await expect(page.locator(".sidebar .active")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Visual Builder", exact: true })).toHaveCount(0);
  await page.evaluate(() => window.history.back());
  await expect(alert).toContainText("conversion results");
  await alert.getByRole("button", { name: "Stay here", exact: true }).click();
  await expect(page).toHaveURL(/\/conversions$/);
  await page.evaluate(() => window.history.back());
  await alert.getByRole("button", { name: "Switch workspace", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:5190/");
  await expect(page.locator(".preview-table")).toHaveCount(0);
});

test("mobile workspace switch is reachable and Escape cancels", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await dismissWelcome(page);
  await page.getByRole("button", { name: "Open EasyMadeConversions", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open EasyMadeConversions", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Open EasyMadeConversions", exact: true }).click();
  await page.getByRole("button", { name: "Switch workspace", exact: true }).click();
  await dismissWelcome(page);
  await expect(page.locator(".navbar").getByRole("button", { name: "Back to EasyMadeInsights" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("full sheet preview includes every column, pagination, search, and complete long cells", async ({ page }) => {
  await page.goto("/");
  await dismissWelcome(page);
  const rows = Array.from({ length: 65 }, (_, index) => ({
    Region: "North", Revenue: index + 1, Units: 1, Channel: "Web", Owner: "Alex",
    Status: "Open", Extra: "Column seven", Notes: index === 64 ? "Final record " + "Complete long cell. ".repeat(40) : `Record ${index + 1}`,
  }));
  await uploadWorkbook(page, rows);
  const trigger = page.getByRole("button", { name: "Open full sheet preview" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("th")).toHaveCount(8);
  await expect(dialog.locator("tbody tr")).toHaveCount(25);
  await dialog.getByRole("button", { name: "Next page" }).click();
  await expect(dialog.getByRole("status")).toContainText("Page 2 of 3");
  await dialog.getByLabel("Search rows").fill("Final record");
  await expect(dialog.locator("tbody tr")).toHaveCount(1);
  await expect(dialog.locator("td").last()).toHaveText(rows[64].Notes);
  expect(await dialog.locator("td").last().evaluate((cell) => getComputedStyle(cell).textOverflow)).not.toBe("ellipsis");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("local takeaways follow the selected metric and use totals beyond the chart sample", async ({ page }) => {
  let aiCalls = 0;
  page.on("request", (request) => { if (request.url().includes("/api/ai-insights")) aiCalls++; });
  await page.goto("/");
  await dismissWelcome(page);
  await uploadWorkbook(page, Array.from({ length: 12 }, (_, i) => ({ Region: `Group ${i}`, Revenue: 100, Units: i + 1 })));
  const takeaways = page.locator(".takeaways");
  await expect(page.getByLabel("Metric", { exact: true }).locator('option[value="Region"]')).toHaveCount(0);
  await expect(takeaways).toContainText("$1,200");
  await expect(takeaways).toContainText("8.3% of the full measured total");
  await page.getByLabel("Metric", { exact: true }).selectOption("Units");
  await expect(takeaways).toContainText("Units total");
  await expect(takeaways).toContainText("Group 11");
  await expect(takeaways).toContainText("15.4% of the full measured total");
  await takeaways.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/tools/workbook-takeaways.png", animations: "disabled" });
  expect(aiCalls).toBe(0);
});

test("expanded image uses the encoded export, fits on mobile, and closes independently", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openTool(page, "Image Converter Studio");
  const buffer = Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 1600; canvas.height = 900;
    const context = canvas.getContext("2d"); context.fillStyle = "#247a98"; context.fillRect(0, 0, 1600, 900);
    return Array.from(Uint8Array.from(atob(canvas.toDataURL().split(",")[1]), (c) => c.charCodeAt(0)));
  }));
  await page.getByLabel("Select image file").setInputFiles({ name: "wide.png", mimeType: "image/png", buffer });
  await expect(page.getByRole("button", { name: "Download converted image" })).toBeEnabled();
  const url = await page.getByAltText("Converted", { exact: true }).getAttribute("src");
  const trigger = page.getByRole("button", { name: "Expand image preview" });
  await trigger.click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.locator(".image-studio-modal").locator("..")).toHaveAttribute("inert", "");
  const image = page.getByAltText("Expanded export preview");
  await expect(image).toHaveAttribute("src", url);
  await expect.poll(() => image.evaluate((img) => img.complete && img.naturalWidth)).toBe(1600);
  expect(await image.evaluate((img) => {
    const stage = img.closest(".expanded-preview-stage").getBoundingClientRect();
    const box = img.getBoundingClientRect();
    return box.width <= stage.width && box.height <= stage.height;
  })).toBe(true);
  await page.screenshot({ path: "test-results/tools/image-preview-mobile.png", animations: "disabled" });
  await page.getByRole("button", { name: "100% size", exact: true }).click();
  expect(await image.evaluate((img) => img.getBoundingClientRect().width)).toBe(1600);
  expect(await page.locator(".expanded-preview-stage").evaluate((stage) => stage.scrollWidth > stage.clientWidth)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator(".expanded-preview")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => document.getElementById("root").inert)).toBe(false);
});

test("DOCX popup fits landscape pages without squeezing content and allows full-size scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openTool(page, "Word to PDF Converter");
  const document = new Document({ sections: [
    { properties: { page: { size: { orientation: PageOrientation.LANDSCAPE, width: 15840, height: 12240 } } },
      children: Array.from({ length: 15 }, (_, i) => new Paragraph(`Landscape record ${i + 1}`)) },
    { properties: {}, children: [new Paragraph("Second page complete content")] },
  ] });
  await page.getByLabel("Select Word file").setInputFiles({ name: "pages.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: await Packer.toBuffer(document) });
  await page.getByRole("button", { name: "Expand original preview" }).click();
  const host = page.getByRole("dialog").locator(".docx-preview-host");
  await expect(host).toContainText("Second page complete content");
  await expect(host.locator(".docx-page-frame")).toHaveCount(2);
  await expect.poll(() => host.evaluate((element) => {
    const frames = Array.from(element.querySelectorAll(".docx-page-frame"));
    return frames.every((frame) => frame.clientWidth > 0 && frame.clientWidth <= element.clientWidth);
  })).toBe(true);
  await page.screenshot({ path: "test-results/tools/docx-preview-mobile.png", animations: "disabled" });
  await page.getByRole("button", { name: "100% size", exact: true }).click();
  await expect.poll(() => host.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "Fit to window", exact: true }).click();
  await expect.poll(() => host.evaluate((element) => element.scrollWidth <= element.clientWidth + 2)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Expand original preview" })).toBeFocused();
});

test("PDF popup uses the original document and converted preview downloads the real DOCX", async ({ page }) => {
  await openTool(page, "PDF to Word Converter");
  const pdf = new jsPDF(); pdf.text("Original PDF content", 20, 20);
  const docx = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph("Editable converted content")] }] }));
  await page.route("**/api/convert/pdf-to-word", (route) => route.fulfill({ status: 200,
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", body: docx }));
  await page.getByLabel("Select PDF file").setInputFiles({ name: "preview.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdf.output("arraybuffer")) });
  await page.getByRole("button", { name: "Expand original preview" }).click();
  await expect(page.getByRole("dialog").locator("iframe")).toHaveAttribute("src", /blob:.*#view=FitH/);
  expect((await page.getByRole("dialog").locator("iframe").boundingBox()).height).toBeGreaterThan(300);
  await page.getByRole("button", { name: "Close preview" }).click();
  await page.getByRole("button", { name: "Convert to Word", exact: true }).click();
  await page.getByRole("button", { name: "Expand converted preview" }).click();
  await expect(page.getByRole("dialog").locator(".docx-preview-host")).toContainText("Editable converted content");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download file", exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("preview.docx");
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  expect(Buffer.concat(chunks)).toEqual(docx);
});
