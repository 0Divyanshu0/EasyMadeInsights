const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function requestConversion(mode, file, signal, fetchRequest = fetch, options = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 120000);
  const base = (import.meta.env?.VITE_API_BASE_URL || "").replace(/\/$/, "");
  const unavailable = "Document conversion is currently unavailable. Please try again later.";
  try {
    const form = new FormData();
    form.append("file", file);
    if (mode === "pdf-to-word") form.append("ocrMode", options.ocrMode ?? "auto");
    const response = await fetchRequest(`${base}/api/convert/${mode}`, {
      method: "POST", body: form, signal: controller.signal,
    });
    const type = (response.headers.get("content-type") || "").split(";")[0];
    if (!response.ok) {
      let message = unavailable;
      if (type === "application/json") {
        try { message = (await response.json()).error || message; } catch { /* Empty API error. */ }
      }
      throw new Error(message);
    }
    const expected = mode === "word-to-pdf" ? "application/pdf" : DOCX_TYPE;
    if (type !== expected && type !== "application/octet-stream") throw new Error(unavailable);
    const blob = await response.blob();
    const bytes = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
    const valid = mode === "word-to-pdf"
      ? new TextDecoder().decode(bytes) === "%PDF-"
      : bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4;
    if (!valid) throw new Error("The conversion returned an invalid file. Please try again.");
    return blob;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(signal?.aborted ? "Conversion cancelled." : "Conversion timed out. Try a smaller document.");
    }
    if (error instanceof TypeError) throw new Error(unavailable);
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
