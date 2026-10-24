import { test, expect } from "@playwright/test";
import { Document, Packer, Paragraph } from "docx";

async function openTool(page, name = "Image Converter Studio") {
  await page.goto("/conversions");
  const welcome = page.locator(".welcome-overlay button");
  if (await welcome.isVisible()) await welcome.click();
  await expect(page.locator(".welcome-overlay")).toHaveCount(0);
  await page.locator(".tool-card").filter({ has: page.getByRole("heading", { name, exact: true }) })
    .getByRole("button", { name: "Use Tool", exact: true }).click();
}

async function loadImage(page, width = 640, height = 480) {
  const bytes = await page.evaluate(({ width, height }) => {
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#247a98"; context.fillRect(0, 0, width, height);
    context.fillStyle = "#f97316"; context.fillRect(0, 0, width / 2, height / 2);
    return Array.from(Uint8Array.from(atob(canvas.toDataURL().split(",")[1]), (char) => char.charCodeAt(0)));
  }, { width, height });
  await page.getByLabel("Select image file").setInputFiles({ name: "editing.png", mimeType: "image/png", buffer: Buffer.from(bytes) });
  await expect(page.getByRole("button", { name: "Download converted image" })).toBeEnabled();
}

test("non-crop controls leave crop mode and show their changes on the clean export", async ({ page }) => {
  await openTool(page);
  await loadImage(page);
  const actions = [
    () => page.getByLabel("Brightness", { exact: false }).fill("20"),
    () => page.getByLabel("Resize width", { exact: true }).fill("320"),
    () => page.getByRole("button", { name: "Mono", exact: true }).click(),
    () => page.getByRole("button", { name: "50%", exact: true }).click(),
    () => page.getByLabel("Format", { exact: true }).selectOption("jpg"),
    () => page.getByRole("button", { name: "Flip horizontal", exact: true }).click(),
    () => page.getByLabel("Keep aspect ratio").uncheck(),
    () => page.getByRole("button", { name: "Reset edits", exact: true }).click(),
  ];
  for (const action of actions) {
    await page.getByRole("button", { name: "Crop image", exact: true }).click();
    await expect(page.locator(".studio-crop-surface")).toBeVisible();
    await action();
    await expect(page.locator(".studio-crop-surface")).toHaveCount(0);
    await expect(page.getByAltText("Converted", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download converted image" })).toBeEnabled();
  }
});

test("crop back and repeated entry buttons keep completed edits without trapping the user", async ({ page }) => {
  await openTool(page);
  await loadImage(page);
  const trigger = page.getByRole("button", { name: "Crop visually", exact: true });
  await trigger.click();
  await page.getByLabel("Crop aspect ratio").selectOption("1");
  await page.getByRole("button", { name: "Back to preview", exact: true }).click();
  await expect(trigger).toBeFocused();
  await expect(page.locator(".studio-crop-surface")).toHaveCount(0);
  await expect(page.getByLabel("Crop width", { exact: true })).toHaveValue("480");
  await expect(page.getByRole("status").filter({ hasText: "Ready:" })).toContainText("480 x 480");
  for (const name of ["Crop visually", "Crop image"]) {
    const button = page.getByRole("button", { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".studio-crop-selection")).toHaveCount(0);
  }
});

test("Escape cancels an unfinished crop before returning to preview, not the tool list", async ({ page }) => {
  await openTool(page);
  await loadImage(page);
  await page.getByRole("button", { name: "Crop image", exact: true }).click();
  await page.getByRole("button", { name: "Draw new crop", exact: true }).click();
  const surface = page.locator(".studio-crop-surface");
  await surface.scrollIntoViewIfNeeded();
  const box = await surface.boundingBox();
  await page.mouse.move(box.x + box.width * .2, box.y + box.height * .2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .7, box.y + box.height * .7, { steps: 4 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.locator(".studio-crop-surface")).toHaveCount(0);
  await expect(page.getByLabel("Crop width", { exact: true })).toHaveValue("640");
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Crop image", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("losing pointer capture rolls back a partial crop and allows the next gesture", async ({ page }) => {
  await openTool(page);
  await loadImage(page);
  await page.getByRole("button", { name: "Crop image", exact: true }).click();
  await page.getByRole("button", { name: "Draw new crop", exact: true }).click();
  const surface = page.locator(".studio-crop-surface");
  await surface.scrollIntoViewIfNeeded();
  const box = await surface.boundingBox();
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 100, { steps: 3 });
  await surface.evaluate((element) => element.releasePointerCapture(1));
  await page.mouse.up();
  await expect(page.getByLabel("Crop width", { exact: true })).toHaveValue("640");
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 100, { steps: 3 });
  await page.mouse.up();
  await expect(page.getByLabel("Crop width", { exact: true })).not.toHaveValue("640");
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeEnabled();
});

for (const viewport of [{ name: "short-desktop", width: 1280, height: 540 }, { name: "tablet", width: 768, height: 600 }, { name: "small-mobile", width: 390, height: 600 }]) {
  test(`${viewport.name} crop controls stay separate from the photo and both return paths remain usable`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => localStorage.setItem("easy-made-insights-theme", "dark"));
    await openTool(page);
    await loadImage(page, 480, 1600);
    await page.getByRole("button", { name: "Crop visually", exact: true }).click();
    const back = page.getByRole("button", { name: "Back to preview", exact: true });
    await back.scrollIntoViewIfNeeded();
    const toolbar = await page.locator(".studio-crop-toolbar").boundingBox();
    const stage = await page.locator(".studio-crop-stage").boundingBox();
    expect(toolbar.y + toolbar.height).toBeLessThanOrEqual(stage.y);
    await expect(back).toBeInViewport();
    for (const corner of ["nw", "ne", "sw", "se"]) {
      const handle = page.getByRole("button", { name: "Resize crop " + corner, exact: true });
      expect(await handle.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
      expect(await handle.evaluate((element) => parseFloat(getComputedStyle(element, "::after").width))).toBeLessThanOrEqual(12);
    }
    expect(await page.getByRole("dialog").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: `test-results/tools/crop-back-${viewport.name}.png`, animations: "disabled" });
    await back.click();
    await expect(page.locator(".studio-crop-selection")).toHaveCount(0);
    await page.getByRole("button", { name: "Back to tools", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".tool-card").filter({ has: page.getByRole("heading", { name: "Image Converter Studio", exact: true }) })
      .getByRole("button", { name: "Use Tool", exact: true })).toBeFocused();
  });
}

test("every catalogue tool offers a usable Back to tools action", async ({ page }) => {
  await openTool(page);
  await page.getByRole("button", { name: "Back to tools", exact: true }).click();
  const cards = page.locator(".tool-card");
  for (let index = 0; index < await cards.count(); index += 1) {
    const opener = cards.nth(index).getByRole("button", { name: "Use Tool", exact: true });
    await opener.click();
    await page.getByRole("button", { name: "Back to tools", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(opener).toBeFocused();
  }
});

test("expanded image Back to editor preserves edits and restores preview focus", async ({ page }) => {
  await openTool(page);
  await loadImage(page);
  await page.getByLabel("Brightness", { exact: false }).fill("20");
  const expand = page.getByRole("button", { name: "Expand image preview", exact: true });
  await expect(expand).toBeEnabled();
  await expand.click();
  await page.getByRole("button", { name: "Back to editor", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(expand).toBeFocused();
  await expect(page.getByLabel("Brightness", { exact: false })).toHaveValue("20");
  await expect(page.getByRole("button", { name: "Download converted image" })).toBeEnabled();
});

test("expanded document Back to converter keeps the uploaded file and preview", async ({ page }) => {
  await openTool(page, "Word to PDF Converter");
  await page.getByLabel("Select Word file").setInputFiles({ name: "return.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph("Keep my document")] }] })) });
  await expect(page.locator(".docx-preview-host")).toContainText("Keep my document");
  const expand = page.getByRole("button", { name: "Expand original preview", exact: true });
  await expand.click();
  await page.getByRole("button", { name: "Back to converter", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(expand).toBeFocused();
  await expect(page.locator(".file-name")).toContainText("return.docx");
  await expect(page.locator(".docx-preview-host")).toContainText("Keep my document");
});
