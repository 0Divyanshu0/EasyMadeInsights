import { useState } from "react";
import * as mammoth from "mammoth";
import DocxPreview from "./DocxPreview";

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
      if (!String(parsed).includes("Cannot POST")) {
        throw new Error(parsed);
      }
    } catch (error) {
      lastError = error?.message || lastError;
    }
  }

  throw new Error(lastError);
};

export default function WordToPDF() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [convertedBlob, setConvertedBlob] = useState(null);
  const [convertedName, setConvertedName] = useState("");
  const [convertedPreviewUrl, setConvertedPreviewUrl] = useState("");

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.doc') &&
        !selectedFile.name.toLowerCase().endsWith('.docx')) {
      setError("Please select a valid Word document (.doc or .docx)");
      setFile(null);
      setPreviewHtml("");
      setPreviewText("");
      if (convertedPreviewUrl) {
        URL.revokeObjectURL(convertedPreviewUrl);
      }
      setConvertedPreviewUrl("");
      return;
    }

    setFile(selectedFile);
    setError("");
    setMessage("");
    setConvertedBlob(null);
    setConvertedName("");
    if (convertedPreviewUrl) {
      URL.revokeObjectURL(convertedPreviewUrl);
      setConvertedPreviewUrl("");
    }

    try {
      // Extract HTML and text for preview
      const arrayBuffer = await selectedFile.arrayBuffer();
      const html = await convertDocxToHtmlWithImages(arrayBuffer);
      setPreviewHtml(html);
      const textResult = await mammoth.extractRawText({ arrayBuffer });
      setPreviewText(textResult.value);
    } catch (err) {
      setError("Failed to preview Word document: " + err.message);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      setError("Please select a Word file first");
      return;
    }

    setIsConverting(true);
    setError("");
    setMessage("");

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await postConvertWithFallback("/api/convert/word-to-pdf", form);

      const blob = await response.blob();
      const outputName = file.name.replace(/\.(doc|docx)$/i, ".pdf");

      if (convertedPreviewUrl) {
        URL.revokeObjectURL(convertedPreviewUrl);
      }

      const objectUrl = URL.createObjectURL(blob);
      setConvertedBlob(blob);
      setConvertedName(outputName);
      setConvertedPreviewUrl(objectUrl);

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
    link.download = convertedName || "converted.pdf";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tool-content word-to-pdf">
      <div className="upload-section">
        <label htmlFor="word-input" className="file-label">
          Select Word File:
        </label>
        <input
          id="word-input"
          type="file"
          accept=".doc,.docx"
          onChange={handleFileSelect}
          className="file-input"
        />
        {file && <p className="file-name">Selected: {file.name}</p>}
      </div>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="info-message">{message}</div>}

      {previewHtml && previewText && (
        <div className="preview-section">
          <h4>Preview - Side by Side</h4>
          <div className="preview-split">
            <div className="preview-panel">
              <div className="preview-panel-header">Original Word Document</div>
              <div className="preview-content word-to-pdf-preview">
                {file && file.name.toLowerCase().endsWith(".docx") ? (
                  <DocxPreview docxBlob={file} />
                ) : (
                  <div className="mammoth-content" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                )}
              </div>
            </div>
            <div className="preview-panel">
              <div className="preview-panel-header">Converted PDF Preview</div>
              <div className="preview-content preview-content-embed">
                {convertedPreviewUrl ? (
                  <iframe title="Converted PDF Preview" src={convertedPreviewUrl} className="preview-iframe" />
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
        {isConverting ? "Converting..." : "Convert to PDF"}
      </button>

      {convertedBlob && (
        <button className="convert-btn" onClick={handleDownload}>
          Download PDF File
        </button>
      )}

      <div className="info-box">
        <p>
          <strong>Note:</strong> Conversion runs on the server for stronger formatting consistency.
          Review the preview before downloading.
        </p>
      </div>
    </div>
  );
}
