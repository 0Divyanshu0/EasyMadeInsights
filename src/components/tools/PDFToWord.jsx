import { useState } from "react";
import * as pdfParse from "pdf-parse";
import { Document, Packer, Paragraph, TextRun } from "docx";

export default function PDFToWord() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [previewText, setPreviewText] = useState("");

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setError("Please select a valid PDF file");
      return;
    }

    setFile(selectedFile);
    setError("");
    setMessage("");

    try {
      // Extract text for preview
      const arrayBuffer = await selectedFile.arrayBuffer();
      const data = await pdfParse(new Uint8Array(arrayBuffer));
      setPreviewText(data.text);
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
      // Read the PDF file
      const arrayBuffer = await file.arrayBuffer();
      const data = await pdfParse(new Uint8Array(arrayBuffer));

      // Extract text content
      const textContent = data.text;

      if (!textContent.trim()) {
        throw new Error("No text content found in the PDF. The PDF might contain only images.");
      }

      // Create a Word document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Converted from PDF: " + file.name,
                    bold: true,
                    size: 32,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Conversion Date: " + new Date().toLocaleString(),
                    italics: true,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "",
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Extracted Content:",
                    bold: true,
                    size: 28,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "",
                    size: 24,
                  }),
                ],
              }),
              ...textContent.split('\n').map(line =>
                new Paragraph({
                  children: [
                    new TextRun({
                      text: line || " ",
                      size: 24,
                    }),
                  ],
                })
              ),
            ],
          },
        ],
      });

      // Generate the Word document
      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      });

      // Download the Word document
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name.replace(".pdf", ".docx");
      link.click();
      URL.revokeObjectURL(url);

      setMessage("PDF successfully converted to Word document!");
      setFile(null);
      alert(`PDF converted successfully! Downloaded as ${file.name.replace(".pdf", ".docx")}`);

    } catch (err) {
      console.error("Conversion error:", err);
      setError("Conversion failed: " + err.message);
    } finally {
      setIsConverting(false);
    }
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
          <h4>Preview - Converted Content</h4>
          <div className="preview-content">
            <pre>{previewText}</pre>
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

      <div className="info-box">
        <p>
          <strong>Note:</strong> This tool extracts text content from PDF files and creates a Word document.
          Complex formatting, images, and tables may not be preserved.
        </p>
      </div>
    </div>
  );
}