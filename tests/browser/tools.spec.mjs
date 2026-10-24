import { test, expect } from "@playwright/test";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, Table, TableRow, TableCell } from "docx";

async function openTool(page, name) {
  await page.goto("/conversions");
  const welcome = page.getByRole("button", { name: "Enter Tools" });
  await welcome.waitFor({ state: "visible" }).catch(() => {});
  if (await welcome.isVisible()) await welcome.click();
  await page.locator(".tool-card").filter({ has: page.getByRole("heading", { name, exact: true }) }).getByRole("button", { name: "Use Tool" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function imageFixture(page) {
  return Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 120; canvas.height = 60;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "red"; ctx.fillRect(0, 0, 60, 60);
    return Array.from(Uint8Array.from(atob(canvas.toDataURL().split(",")[1]), (c) => c.charCodeAt(0)));
  }));
}

async function uploadImage(page) {
  await page.getByLabel("Select image file").setInputFiles({ name: "sample.png", mimeType: "image/png", buffer: await imageFixture(page) });
  await expect(page.getByRole("button", { name: "Download converted image" })).toBeEnabled();
}

test("JWT accepts Unicode Base64URL, resets old results, and copies", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openTool(page, "JWT Decoder");
  const payload = { name: "Zo\u00eb \u4e2d\u6587", note: "\u{1f680}", exp: 1900000000 };
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  await page.getByLabel("Paste your JWT token:").fill(`${encode({ alg: "HS256" })}.${encode(payload)}.AA`);
  await page.getByRole("button", { name: "Decode", exact: true }).click();
  await expect(page.locator(".jwt-payload pre")).toContainText(payload.name);
  await page.getByRole("button", { name: "Copy All to Clipboard" }).click();
  await expect(page.getByRole("status")).toHaveText("Decoded token copied.");
  expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText())).payload).toEqual(payload);
  await page.getByLabel("Paste your JWT token:").fill("bad.token");
  await expect(page.locator(".decoded-section")).toHaveCount(0);
  await page.getByRole("button", { name: "Decode", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("three parts");
});

test("Compare Now compares multiple edits, preserves spaces, and resets", async ({ page }) => {
  await openTool(page, "File Comparison Tool");
  await page.getByLabel("Text 1", { exact: true }).fill("first  old\nsecond old\nunchanged");
  await page.getByLabel("Text 2", { exact: true }).fill("first  new\nsecond new\nunchanged");
  await expect(page.locator(".diff-row")).toHaveCount(0);
  await page.getByRole("button", { name: "Compare Now" }).click();
  await expect(page.locator(".diff-row.modified")).toHaveCount(2);
  await expect(page.locator(".left-text").first()).toHaveText("first  old");
  await page.getByLabel("Text 2", { exact: true }).fill("first  old\nsecond old\nunchanged");
  await expect(page.locator(".diff-row")).toHaveCount(0);
  await page.getByRole("button", { name: "Compare Now" }).click();
  await expect(page.getByRole("status")).toHaveText("The inputs are identical.");
  await page.getByLabel("Text 2", { exact: true }).fill("");
  await page.getByRole("button", { name: "Compare Now" }).click();
  await expect(page.locator(".diff-row.removed")).toHaveCount(3);
});

test("image rotates without clipping and rejects invalid crops", async ({ page }) => {
  await openTool(page, "Image Converter Studio");
  await uploadImage(page);
  await page.getByLabel("Rotation (0 degrees)").fill("90");
  await expect(page.getByRole("status").filter({ hasText: "Ready:" })).toContainText("60 x 120");
  expect(await page.getByAltText("Converted").evaluate((img) => [img.naturalWidth, img.naturalHeight])).toEqual([60, 120]);
  await page.getByLabel("Crop width", { exact: true }).fill("999");
  await expect(page.getByRole("alert")).toContainText("crop must stay inside");
  await expect(page.getByRole("button", { name: "Download converted image" })).toBeDisabled();
  await page.getByLabel("Crop width", { exact: true }).fill("120");
  await expect(page.getByRole("button", { name: "Download converted image" })).toBeEnabled();
});

test("favicon download has an ICO header and embedded PNG", async ({ page }) => {
  await openTool(page, "Image Converter Studio");
  await uploadImage(page);
  await page.getByLabel("Format", { exact: true }).selectOption("favicon");
  await expect(page.getByRole("status").filter({ hasText: "Ready:" })).toContainText("64 x 64");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download converted image" }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("sample-converted.ico");
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  expect(Array.from(bytes.subarray(0, 6))).toEqual([0, 0, 1, 0, 1, 0]);
  expect(bytes.readUInt32LE(18)).toBe(22);
  expect(Array.from(bytes.subarray(22, 30))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
});

test("JPEG output fills transparent pixels white", async ({ page }) => {
  await openTool(page, "Image Converter Studio");
  await uploadImage(page);
  await page.getByLabel("Format", { exact: true }).selectOption("jpg");
  await expect(page.getByRole("button", { name: "Download converted image" })).toBeEnabled();
  const pixel = await page.getByAltText("Converted").evaluate((img) => {
    const canvas = document.createElement("canvas"); canvas.width = 120; canvas.height = 60;
    const ctx = canvas.getContext("2d"); ctx.drawImage(img, 0, 0);
    return Array.from(ctx.getImageData(100, 30, 1, 1).data);
  });
  expect(pixel).toEqual([255, 255, 255, 255]);
});

test("studio accepts drops and supports visual crop movement, resizing, and undo", async ({ page }) => {
  await openTool(page, "Image Converter Studio");
  const fixture = await imageFixture(page);
  const transfer = await page.evaluateHandle((bytes) => {
    const data = new DataTransfer();
    data.items.add(new File([new Uint8Array(bytes)], "dropped.png", { type: "image/png" }));
    return data;
  }, Array.from(fixture));
  await page.locator(".studio-dropzone").dispatchEvent("drop", { dataTransfer: transfer });
  await expect(page.getByRole("button", { name: "Download converted image" })).toBeEnabled();
  await page.getByLabel("Crop aspect ratio").selectOption("1");
  await expect(page.getByLabel("Crop width", { exact: true })).toHaveValue("60");
  const selection = page.getByRole("button", { name: "Move crop selection" });
  await selection.scrollIntoViewIfNeeded();
  const box = await selection.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByLabel("Crop X", { exact: true })).toHaveValue("40");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Crop X", { exact: true })).toHaveValue("30");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByLabel("Crop X", { exact: true })).toHaveValue("40");
  const cornerControl = page.getByRole("button", { name: "Resize crop se" });
  await cornerControl.scrollIntoViewIfNeeded();
  const corner = await cornerControl.boundingBox();
  await page.mouse.move(corner.x + corner.width / 2, corner.y + corner.height / 2);
  await page.mouse.down();
  await page.mouse.move(corner.x + corner.width / 2 - 15, corner.y + corner.height / 2 - 15, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByLabel("Crop width", { exact: true })).toHaveValue("45");
  await expect(page.getByLabel("Crop height", { exact: true })).toHaveValue("45");
  await selection.focus();
  await page.keyboard.press("Shift+ArrowRight");
  await expect(page.getByLabel("Crop X", { exact: true })).toHaveValue("50");
  await page.getByRole("button", { name: "Export preview", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Ready:" })).toContainText("45 x 45");
});

test("studio preview bytes equal downloads in every output format", async ({ page }) => {
  await openTool(page, "Image Converter Studio");
  await uploadImage(page);
  await page.getByLabel("Brightness", { exact: false }).fill("18");
  await page.getByLabel("Export background").selectOption("solid");
  await page.getByLabel("Background color", { exact: true }).fill("#abcdef");
  for (const format of ["png", "jpg", "webp", "favicon"]) {
    await page.getByLabel("Format", { exact: true }).selectOption(format);
    await expect(page.getByRole("button", { name: "Download converted image" })).toBeEnabled();
    const preview = await page.getByAltText("Converted", { exact: true }).evaluate(async (img) => {
      await img.decode();
      return Array.from(new Uint8Array(await (await fetch(img.src)).arrayBuffer()));
    });
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download converted image" }).click();
    const download = await pending;
    const chunks = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    expect(Array.from(format === "favicon" ? bytes.subarray(22) : bytes)).toEqual(preview);
    const background = await page.getByAltText("Converted", { exact: true }).evaluate((img) => {
      const canvas = document.createElement("canvas"); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d"); ctx.drawImage(img, 0, 0);
      return Array.from(ctx.getImageData(canvas.width - 3, canvas.height / 2, 1, 1).data);
    });
    for (let channel = 0; channel < 3; channel++) expect(Math.abs(background[channel] - [171, 205, 239][channel])).toBeLessThanOrEqual(4);
    expect(background[3]).toBe(255);
  }
});

test("studio preserves default pixels and bakes flips and tones into output", async ({ page }) => {
  await openTool(page, "Image Converter Studio");
  await uploadImage(page);
  const pixels = async (alt) => page.getByAltText(alt, { exact: true }).evaluate(async (img) => {
    await img.decode();
    const canvas = document.createElement("canvas"); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d"); ctx.drawImage(img, 0, 0);
    return Array.from(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
  });
  expect(await pixels("Converted")).toEqual(await pixels("Original"));
  await page.getByRole("button", { name: "Flip horizontal" }).click();
  await expect(page.getByRole("button", { name: "Download converted image" })).toBeEnabled();
  const flipped = await pixels("Converted");
  expect(flipped.slice((30 * 120 + 100) * 4, (30 * 120 + 100) * 4 + 4)).toEqual([255, 0, 0, 255]);
  await page.getByRole("button", { name: "Mono", exact: true }).click();
  await expect(page.getByRole("button", { name: "Download converted image" })).toBeEnabled();
  const gray = (await pixels("Converted")).slice((30 * 120 + 100) * 4, (30 * 120 + 100) * 4 + 4);
  expect(gray[0]).toBe(gray[1]); expect(gray[1]).toBe(gray[2]);
  await page.getByRole("button", { name: "Reset edits" }).click();
  await expect(page.getByRole("button", { name: "Download converted image" })).toBeEnabled();
  expect(await pixels("Converted")).toEqual(await pixels("Original"));
  await page.getByLabel("Resize width", { exact: true }).fill("60");
  await expect(page.getByLabel("Resize height", { exact: true })).toHaveValue("30");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Resize width", { exact: true })).toHaveValue("120");
});

test("studio remains usable on a small screen in dark mode", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("easy-made-insights-theme", "dark"));
  await openTool(page, "Image Converter Studio");
  await uploadImage(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByAltText("Converted", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Download converted image" }).scrollIntoViewIfNeeded();
  const overflow = await page.getByRole("dialog").evaluate((dialog) => dialog.scrollWidth > dialog.clientWidth);
  expect(overflow).toBeFalsy();
  await page.screenshot({ path: test.info().outputPath("studio-mobile-dark.png") });
});

test("document conversion rejects the Firebase HTML fallback", async ({ page }) => {
  await openTool(page, "PDF to Word Converter");
  await page.route("**/api/convert/pdf-to-word", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<html>App shell</html>" }));
  const pdf = new jsPDF(); pdf.text("Test document", 20, 20);
  await page.getByLabel("Select PDF file").setInputFiles({ name: "sample.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdf.output("arraybuffer")) });
  await expect(page.getByTitle("Original PDF")).toBeVisible();
  await page.getByRole("button", { name: "Convert to Word" }).click();
  await expect(page.getByRole("alert")).toContainText("currently unavailable");
  await expect(page.getByRole("button", { name: "Download Word file" })).toHaveCount(0);
});

test("DOC file can be selected without a broken DOCX preview", async ({ page }) => {
  await openTool(page, "Word to PDF Converter");
  await page.getByLabel("Select Word file").setInputFiles({ name: "legacy.doc", mimeType: "application/msword", buffer: Buffer.from("legacy fixture") });
  await expect(page.getByText("Preview is available for DOCX documents.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Convert to PDF" })).toBeEnabled();
  await page.getByLabel("Select Word file").setInputFiles({ name: "invalid.txt", mimeType: "text/plain", buffer: Buffer.from("bad") });
  await expect(page.getByRole("alert")).toContainText("DOC or DOCX");
  await expect(page.getByRole("button", { name: "Convert to PDF" })).toBeDisabled();
});

test("comparison uploads clear stale results and reject unsupported files", async ({ page }) => {
  await openTool(page, "File Comparison Tool");
  await page.getByRole("button", { name: "Upload Files" }).click();
  await page.getByLabel("File 1", { exact: true }).setInputFiles({ name: "first.txt", mimeType: "text/plain", buffer: Buffer.from("one\r\ntwo") });
  await page.getByLabel("File 2", { exact: true }).setInputFiles({ name: "second.txt", mimeType: "text/plain", buffer: Buffer.from("one\ntwo") });
  await page.getByRole("button", { name: "Compare Now" }).click();
  await expect(page.getByRole("status")).toContainText("identical");
  await page.getByLabel("File 2", { exact: true }).setInputFiles({ name: "bad.pdf", mimeType: "application/pdf", buffer: Buffer.from("binary") });
  await expect(page.getByRole("alert")).toContainText("text file");
  await expect(page.getByRole("button", { name: "Compare Now" })).toBeDisabled();
  await expect(page.locator(".diff-row")).toHaveCount(0);
});

test("conversion replacement clears old downloads and handles JSON errors", async ({ page }) => {
  await openTool(page, "Word to PDF Converter");
  const pdf = new jsPDF(); pdf.text("Converted content", 20, 20);
  await page.route("**/api/convert/word-to-pdf", (route) => route.fulfill({ status: 200, contentType: "application/pdf", body: Buffer.from(pdf.output("arraybuffer")) }));
  await page.getByLabel("Select Word file").setInputFiles({ name: "old.doc", mimeType: "application/msword", buffer: Buffer.from("fixture") });
  await page.getByRole("button", { name: "Convert to PDF" }).click();
  await expect(page.getByRole("button", { name: "Download PDF file" })).toBeVisible();
  await page.getByLabel("Select Word file").setInputFiles({ name: "next.doc", mimeType: "application/msword", buffer: Buffer.from("new fixture") });
  await expect(page.getByRole("button", { name: "Download PDF file" })).toHaveCount(0);
  await page.unroute("**/api/convert/word-to-pdf");
  await page.route("**/api/convert/word-to-pdf", (route) => route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ error: "This document is corrupt." }) }));
  await page.getByRole("button", { name: "Convert to PDF" }).click();
  await expect(page.getByRole("alert")).toHaveText("This document is corrupt.");
});

test("large comparisons show an error without freezing the tool", async ({ page }) => {
  await openTool(page, "File Comparison Tool");
  await page.getByLabel("Text 1", { exact: true }).fill("one\n".repeat(1500));
  await page.getByLabel("Text 2", { exact: true }).fill("two\n".repeat(1500));
  await page.getByRole("button", { name: "Compare Now" }).click();
  await expect(page.getByRole("alert")).toContainText("too large");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("tool modal closes on Escape and restores focus and title", async ({ page }) => {
  await page.goto("/conversions");
  await page.waitForTimeout(2800);
  const title = await page.title();
  const trigger = page.locator(".tool-card").filter({ hasText: "JWT Decoder" }).getByRole("button", { name: "Use Tool" });
  await trigger.click();
  await expect(page.getByRole("button", { name: "Close tool" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Back to tools", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Decode", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Back to tools", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Close tool" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page).toHaveTitle(title);
});

test("real PDF to Word conversion produces editable content", async ({ page }) => {
  test.setTimeout(120000);
  await openTool(page, "PDF to Word Converter");
  await page.route("**/api/convert/pdf-to-word", async (route) => {
    const response = await route.fetch({ url: "http://127.0.0.1:8791/api/convert/pdf-to-word", timeout: 100000 });
    await route.fulfill({ response });
  });
  const pdf = new jsPDF(); pdf.text("Actual conversion content", 20, 20);
  await page.getByLabel("Select PDF file").setInputFiles({ name: "sample.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdf.output("arraybuffer")) });
  await page.getByRole("button", { name: "Convert to Word" }).click();
  await expect(page.getByRole("button", { name: "Download Word file" })).toBeVisible({ timeout: 105000 });
  await expect(page.locator(".docx-preview-host")).toContainText("Actual conversion content");
});

test("real scanned PDF creates editable Word text and recovery changes clear results", async ({ page }) => {
  test.setTimeout(120000);
  await openTool(page, "PDF to Word Converter");
  await page.route("**/api/convert/pdf-to-word", async (route) => {
    const response = await route.fetch({ url: "http://127.0.0.1:8791/api/convert/pdf-to-word", timeout: 100000 });
    await route.fulfill({ response });
  });
  const scan = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 900; canvas.height = 1200;
    const ctx = canvas.getContext("2d"); ctx.fillStyle = "white"; ctx.fillRect(0, 0, 900, 1200);
    ctx.fillStyle = "black"; ctx.font = "32px sans-serif";
    ctx.fillText("Scanned invoice editable content", 60, 120);
    ctx.fillText("Invoice total 1200 dollars", 60, 190);
    return canvas.toDataURL("image/png");
  });
  const pdf = new jsPDF(); pdf.addImage(scan, "PNG", 0, 0, 210, 297);
  await page.getByLabel("Select PDF file").setInputFiles({ name: "scan.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdf.output("arraybuffer")) });
  await page.getByRole("button", { name: "Convert to Word" }).click();
  await expect(page.getByRole("button", { name: "Download Word file" })).toBeVisible({ timeout: 105000 });
  await expect(page.locator(".docx-preview-host")).toContainText("Scanned invoice editable content");
  await expect(page.locator(".docx-preview-host img")).toHaveCount(0);
  await page.getByLabel("Text recovery", { exact: true }).selectOption("force");
  await expect(page.getByRole("button", { name: "Download Word file" })).toHaveCount(0);
});

test("real Word to PDF preserves long paragraphs and table content", async ({ request }) => {
  test.setTimeout(120000);
  const sentence = `${"A long paragraph that must be wrapped without truncation. ".repeat(15)}PARAGRAPH_END`;
  const doc = new Document({ sections: [{ children: [new Paragraph(sentence), new Table({ rows: [new TableRow({ children: [new TableCell({ children: [new Paragraph("TABLE_CONTENT")] })] })] })] }] });
  const buffer = await Packer.toBuffer(doc);
  const response = await request.post("http://127.0.0.1:8791/api/convert/word-to-pdf", { multipart: { file: { name: "sample.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer } }, timeout: 105000 });
  expect(response.status(), await response.text()).toBe(200);
  const pdf = await response.body();
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await getDocument({ data: new Uint8Array(pdf), useSystemFonts: true }).promise;
  const texts = [];
  for (let pageIndex = 1; pageIndex <= document.numPages; pageIndex++) texts.push((await (await document.getPage(pageIndex)).getTextContent()).items.map((item) => item.str).join(" "));
  await document.destroy();
  expect(texts.join(" ")).toContain("PARAGRAPH_END");
  expect(texts.join(" ")).toContain("TABLE_CONTENT");
});
