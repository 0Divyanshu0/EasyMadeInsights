import { useState } from "react";
import * as mammoth from "mammoth";
import jsPDF from "jspdf";

export default function WordToPDF() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [previewText, setPreviewText] = useState("");

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.doc') &&
        !selectedFile.name.toLowerCase().endsWith('.docx')) {
      setError("Please select a valid Word document (.doc or .docx)");
      return;
    }

    setFile(selectedFile);
    setError("");
    setMessage("");

    try {
      // Extract HTML and text for preview
      const arrayBuffer = await selectedFile.arrayBuffer();
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
      setPreviewHtml(htmlResult.value);
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
      // Read the Word file
      const arrayBuffer = await file.arrayBuffer();

      // Convert to HTML using mammoth
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const htmlContent = result.value;

      if (!htmlContent.trim()) {
        throw new Error("No content found in the Word document.");
      }

      // Create PDF using jsPDF with HTML
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Add title
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Converted from Word: " + file.name, 20, 30);

      // Add conversion date
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "italic");
      pdf.text("Conversion Date: " + new Date().toLocaleString(), 20, 45);

      // Add HTML content
      await pdf.html(htmlContent, {
        x: 20,
        y: 60,
        width: 170,
        windowWidth: 650
      });

      // Download the PDF
      pdf.save(file.name.replace(/\.(doc|docx)$/i, ".pdf"));

      setMessage("Word document successfully converted to PDF!");
      setFile(null);
      setPreviewHtml("");
      alert(`Word document converted successfully! Downloaded as ${file.name.replace(/\.(doc|docx)$/i, ".pdf")}`);

    } catch (err) {
      console.error("Conversion error:", err);
      setError("Conversion failed: " + err.message);
    } finally {
      setIsConverting(false);
    }
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
              <div className="preview-content" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
            <div className="preview-panel">
              <div className="preview-panel-header">Converted PDF Content</div>
              <div className="preview-content">
                <pre>{previewText}</pre>
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

      <div className="info-box">
        <p>
          <strong>Note:</strong> This tool extracts text content from Word documents and creates a PDF.
          Complex formatting, images, and tables may not be preserved.
        </p>
      </div>
    </div>
  );
}