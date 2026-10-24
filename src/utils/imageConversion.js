export async function encodeIco(png, width = 64, height = 64) {
  const header = new ArrayBuffer(22);
  const view = new DataView(header);
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);
  view.setUint8(6, width === 256 ? 0 : width);
  view.setUint8(7, height === 256 ? 0 : height);
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, png.size, true);
  view.setUint32(18, 22, true);
  return new Blob([header, png], { type: "image/x-icon" });
}

export async function convertImage(image, settings) {
  const { cropX, cropY, cropWidth, cropHeight, resizeWidth, resizeHeight, rotation, outputFormat, quality } = settings;
  const dims = [cropX, cropY, cropWidth, cropHeight, resizeWidth, resizeHeight];
  if (!dims.every(Number.isInteger) || cropX < 0 || cropY < 0 ||
      cropWidth < 1 || cropHeight < 1 || resizeWidth < 1 || resizeHeight < 1 ||
      cropX + cropWidth > image.naturalWidth || cropY + cropHeight > image.naturalHeight) {
    throw new Error("Enter valid whole-pixel dimensions. The crop must stay inside the original image.");
  }
  if (resizeWidth > 8192 || resizeHeight > 8192 || resizeWidth * resizeHeight > 32000000) {
    throw new Error("Use an output size up to 8192 pixels per side and 32 megapixels in total.");
  }
  if (!["png", "jpg", "webp", "favicon"].includes(outputFormat) || ![0, 90, 180, 270].includes(rotation)) {
    throw new Error("Select a supported format and quarter-turn rotation.");
  }
  const sideways = rotation === 90 || rotation === 270;
  const rotatedWidth = sideways ? resizeHeight : resizeWidth;
  const rotatedHeight = sideways ? resizeWidth : resizeHeight;
  const canvas = document.createElement("canvas");
  canvas.width = outputFormat === "favicon" ? 64 : rotatedWidth;
  canvas.height = outputFormat === "favicon" ? 64 : rotatedHeight;
  const ctx = canvas.getContext("2d", { colorSpace: "srgb", willReadFrequently: true });
  if (!ctx) throw new Error("Image processing is unavailable in this browser.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const scale = outputFormat === "favicon" ? Math.min(64 / rotatedWidth, 64 / rotatedHeight) : 1;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rotation * Math.PI / 180);
  ctx.scale(settings.flipHorizontal ? -1 : 1, settings.flipVertical ? -1 : 1);
  ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight,
    -resizeWidth * scale / 2, -resizeHeight * scale / 2, resizeWidth * scale, resizeHeight * scale);
  ctx.resetTransform();
  const brightness = settings.brightness ?? 0;
  const contrast = settings.contrast ?? 0;
  const saturation = settings.saturation ?? 100;
  const warmth = settings.warmth ?? 0;
  if (brightness || contrast || saturation !== 100 || warmth) {
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const factor = (259 * (contrast * 2.55 + 255)) / (255 * (259 - contrast * 2.55));
    for (let i = 0; i < pixels.data.length; i += 4) {
      if (!pixels.data[i + 3]) continue;
      let r = factor * (pixels.data[i] - 128) + 128 + brightness * 2.55 + warmth * 0.4;
      let g = factor * (pixels.data[i + 1] - 128) + 128 + brightness * 2.55;
      let b = factor * (pixels.data[i + 2] - 128) + 128 + brightness * 2.55 - warmth * 0.4;
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = luminance + (r - luminance) * saturation / 100;
      g = luminance + (g - luminance) * saturation / 100;
      b = luminance + (b - luminance) * saturation / 100;
      pixels.data[i] = r;
      pixels.data[i + 1] = g;
      pixels.data[i + 2] = b;
    }
    ctx.putImageData(pixels, 0, 0);
  }
  // Composite after adjustments so a solid export background retains its chosen color.
  if (outputFormat === "jpg" || settings.background === "solid") {
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = settings.background === "solid" ? settings.backgroundColor : "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";
  }
  const type = outputFormat === "jpg" ? "image/jpeg" : outputFormat === "webp" ? "image/webp" : "image/png";
  const preview = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  if (!preview) throw new Error("Could not encode the image. Try a smaller output size.");
  if (preview.type !== type) throw new Error("This browser cannot encode the selected format. Choose PNG or JPG.");
  const blob = outputFormat === "favicon" ? await encodeIco(preview) : preview;
  return { blob, preview, width: canvas.width, height: canvas.height };
}

export function cropFromDrag(anchor, point, width, height, ratio = null) {
  const clamp = (value, max) => Math.max(0, Math.min(max, value));
  const ax = clamp(Math.round(anchor.x), width);
  const ay = clamp(Math.round(anchor.y), height);
  const px = clamp(Math.round(point.x), width);
  const py = clamp(Math.round(point.y), height);
  const directionX = px < ax ? -1 : 1;
  const directionY = py < ay ? -1 : 1;
  let w = Math.max(1, Math.abs(px - ax));
  let h = Math.max(1, Math.abs(py - ay));
  if (ratio) {
    h = w / ratio;
    const maxW = directionX < 0 ? ax : width - ax;
    const maxH = directionY < 0 ? ay : height - ay;
    const fit = Math.min(1, maxW / w, maxH / h);
    w *= fit;
    h *= fit;
  }
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  return {
    cropX: clamp(directionX < 0 ? ax - w : ax, width - w),
    cropY: clamp(directionY < 0 ? ay - h : ay, height - h),
    cropWidth: w,
    cropHeight: h,
  };
}
