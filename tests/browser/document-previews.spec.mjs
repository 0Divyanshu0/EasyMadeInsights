import { test, expect } from "@playwright/test";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";

async function documentFixture(background) {
  return Packer.toBuffer(new Document({
    ...(background ? { background: { color: background } } : {}),
    sections: [{ children: [
      new Paragraph({ children: [new TextRun({ text: "Document heading", color: "C00000", bold: true })] }),
      ...Array.from({ length: 45 }, (_, index) => new Paragraph({ children: [new TextRun({ text: `Readable document record ${index + 1}`, color: background ? "FFFFFF" : "000000" })] })),
    ] }],
  }));
}

async function openTool(page, theme, name) {
  await page.addInitScript((value) => localStorage.setItem("easy-made-insights-theme", value), theme);
  await page.goto("/conversions");
  const welcome = page.locator(".welcome-overlay button");
  if (await welcome.isVisible()) await welcome.click();
  await expect(page.locator(".welcome-overlay")).toHaveCount(0);
  await page.locator(".tool-card").filter({ has: page.getByRole("heading", { name, exact: true }) })
    .getByRole("button", { name: "Use Tool" }).click();
}

async function expectReadablePaper(host, background = "rgb(255, 255, 255)", textColor = "rgb(0, 0, 0)") {
  await expect(host).toContainText("Readable document record 45");
  await expect.poll(() => host.locator("section.docx").first().evaluate((page) => getComputedStyle(page).backgroundColor)).toBe(background);
  const text = host.getByText("Readable document record 1", { exact: true });
  await expect(text).toBeVisible();
  expect(await text.evaluate((element) => getComputedStyle(element).color)).toBe(textColor);
  expect(await host.getByText("Document heading", { exact: true }).evaluate((element) => getComputedStyle(element).color)).toBe("rgb(192, 0, 0)");
  await expect.poll(() => host.locator(".docx-page-frame").first().evaluate((frame) => frame.getBoundingClientRect().height > 200)).toBe(true);
}

for (const theme of ["light", "dark"]) {
  for (const mode of ["original", "converted"]) {
    test(`${theme} ${mode} DOCX preview has readable paper inline and in the popup`, async ({ page }) => {
      await openTool(page, theme, mode === "original" ? "Word to PDF Converter" : "PDF to Word Converter");
      const buffer = await documentFixture();
      if (mode === "original") {
        await page.getByLabel("Select Word file").setInputFiles({ name: "readable.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer });
      } else {
        await page.route("**/api/convert/pdf-to-word", (route) => route.fulfill({ status: 200,
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", body: buffer }));
        const pdf = new jsPDF(); pdf.text("Readable PDF document", 20, 20);
        await page.getByLabel("Select PDF file").setInputFiles({ name: "readable.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdf.output("arraybuffer")) });
        await page.getByRole("button", { name: "Convert to Word", exact: true }).click();
      }
      await expectReadablePaper(page.locator(".docx-preview-host"));
      const trigger = page.getByRole("button", { name: `Expand ${mode} preview`, exact: true });
      await trigger.click();
      const popup = page.getByRole("dialog");
      await expectReadablePaper(popup.locator(".docx-preview-host"));
      expect(await popup.locator(".expanded-preview-stage").evaluate((stage) => stage.clientHeight)).toBeGreaterThan(180);
      await popup.locator(".expanded-preview-stage").evaluate((stage) => { stage.scrollTop = stage.scrollHeight; });
      await popup.getByRole("button", { name: "100% size", exact: true }).click();
      const host = popup.locator(".docx-preview-host");
      await expect.poll(() => host.locator(".docx-page-frame").first().evaluate((frame) => frame.clientWidth > 700)).toBe(true);
      await expect(popup.getByText("Readable document record 45", { exact: true })).toBeVisible();
      if (theme === "dark") await page.screenshot({ path: `test-results/tools/${mode}-docx-dark.png`, animations: "disabled" });
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
    });
  }
}

test("custom document background and text colors are not replaced by the app theme", async ({ page }) => {
  await openTool(page, "dark", "Word to PDF Converter");
  await page.getByLabel("Select Word file").setInputFiles({ name: "colored.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: await documentFixture("17365D") });
  await expectReadablePaper(page.locator(".docx-preview-host"), "rgb(23, 54, 93)", "rgb(255, 255, 255)");
  await page.getByRole("button", { name: "Expand original preview" }).click();
  await expectReadablePaper(page.getByRole("dialog").locator(".docx-preview-host"), "rgb(23, 54, 93)", "rgb(255, 255, 255)");
});

test("short mobile screens keep a usable document stage rather than a collapsed popup", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openTool(page, "dark", "Word to PDF Converter");
  await page.setViewportSize({ width: 390, height: 360 });
  await page.getByLabel("Select Word file").setInputFiles({ name: "small-screen.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: await documentFixture() });
  await page.getByRole("button", { name: "Expand original preview" }).click();
  const popup = page.getByRole("dialog");
  await expectReadablePaper(popup.locator(".docx-preview-host"));
  expect(await popup.locator(".expanded-preview-stage").evaluate((stage) => stage.clientHeight)).toBeGreaterThanOrEqual(180);
  expect(await popup.evaluate((dialog) => dialog.getBoundingClientRect().height)).toBeLessThanOrEqual(360);
  await popup.getByRole("button", { name: "100% size", exact: true }).click();
  await popup.getByText("Readable document record 45", { exact: true }).scrollIntoViewIfNeeded();
  await expect(popup.getByText("Readable document record 45", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/tools/docx-short-screen-dark.png", animations: "disabled" });
  await popup.getByRole("button", { name: "Close preview", exact: true }).click();
  await expect(page.locator(".expanded-preview")).toHaveCount(0);
});

test("unrenderable DOCX shows a readable error rather than an empty dark preview", async ({ page }) => {
  await openTool(page, "dark", "Word to PDF Converter");
  await page.getByLabel("Select Word file").setInputFiles({ name: "invalid.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: Buffer.from("This is not a valid DOCX archive.") });
  await expect(page.locator(".docx-preview-host").getByRole("alert")).toContainText("Unable to render");
  await expect(page.locator(".docx-preview-host")).toHaveAttribute("aria-busy", "false");
  await page.getByRole("button", { name: "Expand original preview" }).click();
  const error = page.getByRole("dialog").getByRole("alert");
  await expect(error).toContainText("Download the file to inspect it in Word");
  expect(await error.evaluate((notice) => ({ color: getComputedStyle(notice).color, background: getComputedStyle(notice).backgroundColor }))).toEqual({ color: "rgb(29, 78, 216)", background: "rgb(239, 246, 255)" });
});
