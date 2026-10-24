import { test, expect } from "@playwright/test";
import { Document, Packer, Paragraph } from "docx";

async function openTool(page, name, theme = "light") {
  await page.addInitScript((value) => localStorage.setItem("easy-made-insights-theme", value), theme);
  await page.goto("/conversions");
  const welcome = page.locator(".welcome-overlay button");
  if (await welcome.isVisible()) await welcome.click();
  await expect(page.locator(".welcome-overlay")).toHaveCount(0);
  await page.locator(".tool-card").filter({ has: page.getByRole("heading", { name, exact: true }) })
    .getByRole("button", { name: "Use Tool" }).click();
}

async function imageFixture(page, width, height) {
  return Buffer.from(await page.evaluate(({ width, height }) => {
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#247a98"; context.fillRect(0, 0, width, height);
    context.fillStyle = "#f97316"; context.fillRect(0, 0, width / 2, height / 2);
    return Array.from(Uint8Array.from(atob(canvas.toDataURL().split(",")[1]), (char) => char.charCodeAt(0)));
  }, { width, height }));
}

for (const viewport of [{ name: "desktop", width: 1280, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
  for (const shape of [{ name: "portrait", width: 480, height: 1600 }, { name: "landscape", width: 1600, height: 480 }]) {
    test(`${viewport.name} ${shape.name} crop stays transparent and aligned with the displayed image`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openTool(page, "Image Converter Studio", viewport.name === "mobile" ? "dark" : "light");
      if (viewport.name === "desktop") expect((await page.getByRole("dialog").boundingBox()).width).toBeGreaterThan(1100);
      await page.getByLabel("Select image file").setInputFiles({ name: "source.png", mimeType: "image/png", buffer: await imageFixture(page, shape.width, shape.height) });
      await expect(page.getByRole("button", { name: "Download converted image" })).toBeEnabled();
      await page.getByRole("button", { name: "Crop visually", exact: true }).click();
      const selection = page.getByRole("button", { name: "Move crop selection" });
      await expect(selection).toBeVisible();
      expect(await selection.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
      await expect.poll(() => page.locator(".studio-crop-surface").evaluate((surface) => {
        const box = surface.getBoundingClientRect();
        const image = surface.querySelector("img").getBoundingClientRect();
        return Math.abs(box.width - image.width) < 1 && Math.abs(box.height - image.height) < 1;
      })).toBe(true);
      const imageBox = await page.getByAltText("Original crop source").boundingBox();
      const selectionBox = await selection.boundingBox();
      expect(Math.abs(selectionBox.width - imageBox.width)).toBeLessThan(1);
      expect(Math.abs(selectionBox.height - imageBox.height)).toBeLessThan(1);
      await page.getByLabel("Crop aspect ratio").selectOption("1");
      await expect(page.getByLabel("Crop width", { exact: true })).toHaveValue("480");
      await expect(page.getByLabel("Crop height", { exact: true })).toHaveValue("480");
      await page.getByRole("button", { name: "Hide crop guides", exact: true }).click();
      await expect(selection.locator("span")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Show crop guides", exact: true })).toBeVisible();
      const controls = await page.locator(".studio-crop-toolbar").boundingBox();
      const visibleImage = await page.getByAltText("Original crop source").boundingBox();
      expect(controls.y + controls.height).toBeLessThanOrEqual(visibleImage.y);
      for (const corner of ["nw", "ne", "sw", "se"]) {
        const handle = page.getByRole("button", { name: "Resize crop " + corner, exact: true });
        expect((await handle.boundingBox()).width).toBeGreaterThanOrEqual(24);
      }
      await page.locator(".studio-workspace").scrollIntoViewIfNeeded();
      expect(await page.getByRole("dialog").evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth)).toBe(true);
      await page.screenshot({ path: `test-results/tools/crop-${viewport.name}-${shape.name}.png`, animations: "disabled" });
    });
  }
}

test("draw a new crop inside the existing selection and return to a clean export preview", async ({ page }) => {
  await openTool(page, "Image Converter Studio");
  await page.getByLabel("Select image file").setInputFiles({ name: "draw.png", mimeType: "image/png", buffer: await imageFixture(page, 120, 60) });
  await expect(page.getByRole("button", { name: "Download converted image" })).toBeEnabled();
  await page.getByRole("button", { name: "Crop visually", exact: true }).click();
  await page.getByRole("button", { name: "Draw new crop", exact: true }).click();
  const surface = page.locator(".studio-crop-surface");
  await surface.scrollIntoViewIfNeeded();
  const box = await surface.boundingBox();
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 50, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByLabel("Crop X", { exact: true })).toHaveValue("10");
  await expect(page.getByLabel("Crop Y", { exact: true })).toHaveValue("10");
  await expect(page.getByLabel("Crop width", { exact: true })).toHaveValue("70");
  await expect(page.getByLabel("Crop height", { exact: true })).toHaveValue("40");
  await page.getByRole("button", { name: "Done cropping", exact: true }).click();
  await expect(page.locator(".studio-crop-selection")).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Ready:" })).toContainText("70 x 40");
  expect(await page.getByAltText("Converted", { exact: true }).evaluate((image) => [image.naturalWidth, image.naturalHeight])).toEqual([70, 40]);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Crop width", { exact: true })).toHaveValue("120");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByLabel("Crop width", { exact: true })).toHaveValue("70");
  await page.getByRole("button", { name: "Crop visually", exact: true }).click();
  await page.getByRole("button", { name: "Reset crop", exact: true }).click();
  await expect(page.getByLabel("Crop X", { exact: true })).toHaveValue("0");
  await expect(page.getByLabel("Crop Y", { exact: true })).toHaveValue("0");
  await expect(page.getByLabel("Crop width", { exact: true })).toHaveValue("120");
  await page.getByRole("button", { name: "Done cropping", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Ready:" })).toContainText("120 x 60");
});

test("document file picker is keyboard usable, shows the real name, and has clear workflow steps", async ({ page }) => {
  await openTool(page, "Word to PDF Converter", "dark");
  const picker = page.getByRole("button", { name: "Select Word file", exact: true });
  await picker.focus();
  const pending = page.waitForEvent("filechooser");
  await page.keyboard.press("Enter");
  const chooser = await pending;
  await chooser.setFiles({ name: "document.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph("Document preview")] }] })) });
  await expect(page.locator(".file-name")).toContainText("document.docx");
  await expect(page.locator(".docx-preview-host")).toContainText("Document preview");
  await expect(page.getByRole("list", { name: "Conversion steps" })).toContainText("Review & download");
  await expect(page.getByLabel("Select Word file")).toBeHidden();
});

test("mobile comparison keeps both sides readable and clears inputs explicitly", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openTool(page, "File Comparison Tool", "dark");
  await page.getByLabel("Text 1", { exact: true }).fill("First version with a long line of text that should wrap rather than clip.");
  await page.getByLabel("Text 2", { exact: true }).fill("Second version with a long line of text that should wrap rather than clip.");
  await page.getByRole("button", { name: "Compare Now", exact: true }).click();
  const left = await page.locator(".left-text").first().boundingBox();
  const right = await page.locator(".right-text").first().boundingBox();
  expect(left.width).toBeGreaterThan(180);
  expect(right.y).toBeGreaterThanOrEqual(left.y + left.height);
  expect(await page.getByRole("dialog").evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth)).toBe(true);
  await page.locator(".diff-panel").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/tools/comparison-mobile-dark.png", animations: "disabled" });
  await page.getByRole("button", { name: "Clear inputs", exact: true }).click();
  await expect(page.getByLabel("Text 1", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Text 2", { exact: true })).toHaveValue("");
  await expect(page.locator(".diff-row")).toHaveCount(0);
});

test("JWT clear action removes decoded content and keeps the privacy warning visible", async ({ page }) => {
  await openTool(page, "JWT Decoder");
  const token = [Buffer.from('{"alg":"HS256"}').toString("base64url"), Buffer.from('{"name":"Demo"}').toString("base64url"), "AA"].join(".");
  await page.getByLabel("Paste your JWT token:").fill(token);
  await page.getByRole("button", { name: "Decode", exact: true }).click();
  await expect(page.locator(".jwt-payload")).toContainText("Demo");
  await page.getByRole("button", { name: "Clear token", exact: true }).click();
  await expect(page.getByLabel("Paste your JWT token:")).toHaveValue("");
  await expect(page.locator(".decoded-section")).toHaveCount(0);
  await expect(page.locator(".jwt-decoder")).toContainText("Tokens can contain credentials");
});
