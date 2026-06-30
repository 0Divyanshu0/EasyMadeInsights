import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerSrc from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import * as mammoth from "mammoth";
import DocxPreview from "./DocxPreview";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

const extractTextFromPDF = async (arrayBuffer) => {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => item.str)
      .join(" ")
      .replace(/\s{2,}/g, " ")
      .trim();

    text += `${pageText}\n\n`;
  }
  return text;
};

const convertDocxToHtmlWithImages = async (arrayBuffer) => {
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const base64 = await image.read("base64");
        return {
          src: `data:${image.contentType};base64,${base64}`,
        };
      }),
    }
  );
  return result.value || "";
};

const postConvertWithFallback = async (endpoint, formData) => {
  const candidates = [endpoint, `http://localhost:8787${endpoint}`];
  let lastError = "Server conversion failed.";

  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        return response;
      }

      const text = await response.text();
      let parsed = text || lastError;
      try {
        const payload = JSON.parse(text);
        parsed = payload?.error || parsed;
      } catch {
        // keep raw text
      }

      lastError = parsed;

      // Try fallback URL when proxy route is missing
      if (!String(parsed).includes("Cannot POST")) {
        throw new Error(parsed);
      }
    } catch (error) {
      lastError = error?.message || lastError;
    }
  }

  throw new Error(lastError);
};

export default function PDFToWord() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [convertedPreviewHtml, setConvertedPreviewHtml] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [convertedBlob, setConvertedBlob] = useState(null);
  const [convertedName, setConvertedName] = useState("");

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a valid PDF file");
      setFile(null);
      setPreviewText("");
      return;
    }

    setFile(selectedFile);
    setError("");
    setMessage("");
    setConvertedBlob(null);
    setConvertedName("");
    setConvertedPreviewHtml("");

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(selectedFile));

    try {
      // Extract text for preview
      const arrayBuffer = await selectedFile.arrayBuffer();
      const text = await extractTextFromPDF(arrayBuffer);
      setPreviewText(text);
    } catch (err) {
      setError("Failed to preview PDF: " + err.message);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      setError("Please select a PDF file first");
      return;
    }

    setIsConverting(true);
    setError("");
    setMessage("");

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await postConvertWithFallback("/api/convert/pdf-to-word", form);

      const blob = await response.blob();
      const outputName = file.name.replace(/\.pdf$/i, ".docx");

      setConvertedBlob(blob);
      setConvertedName(outputName);

      const arrayBuffer = await blob.arrayBuffer();
      const htmlPreview = await convertDocxToHtmlWithImages(arrayBuffer);
      setConvertedPreviewHtml(htmlPreview);

      setMessage("Conversion completed. Review the preview and click Download.");

    } catch (err) {
      console.error("Conversion error:", err);
      const raw = String(err?.message || "");
      const hint =
        raw.includes("Cannot POST") || raw.includes("Failed to fetch")
          ? "Backend API is unreachable. Start from client folder with npm run dev so both UI and API run."
          : raw;
      setError("Conversion failed: " + hint);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!convertedBlob) return;
    const url = URL.createObjectURL(convertedBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = convertedName || "converted.docx";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tool-content pdf-to-word">
      <div className="upload-section">
        <label htmlFor="pdf-input" className="file-label">
          Select PDF File:
        </label>
        <input
          id="pdf-input"
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="file-input"
        />
        {file && <p className="file-name">Selected: {file.name}</p>}
      </div>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="info-message">{message}</div>}

      {previewText && (
        <div className="preview-section">
          <h4>Preview - Side by Side</h4>
          <div className="preview-split">
            <div className="preview-panel">
              <div className="preview-panel-header">Original PDF</div>
              <div className="preview-content preview-content-embed">
                {previewUrl ? (
                  <iframe title="PDF Preview" src={previewUrl} className="preview-iframe" />
                ) : null}
              </div>
            </div>
            <div className="preview-panel">
              <div className="preview-panel-header">Converted Word Content</div>
              <div className="preview-content pdf-to-word-preview">
                {convertedBlob ? (
                  <DocxPreview docxBlob={convertedBlob} />
                ) : convertedPreviewHtml ? (
                  <div className="mammoth-content" dangerouslySetInnerHTML={{ __html: convertedPreviewHtml }} />
                ) : (
                  <pre>{previewText}</pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        className="convert-btn"
        onClick={handleConvert}
        disabled={!file || isConverting}
      >
        {isConverting ? "Converting..." : "Convert to Word"}
      </button>

      {convertedBlob && (
        <button className="convert-btn" onClick={handleDownload}>
          Download Word File
        </button>
      )}

      <div className="info-box">
        <p>
          <strong>Note:</strong> Conversion runs on the server using a layout-aware engine.
          Review the preview before downloading for best results.
        </p>
      </div>
    </div>
  );
}
