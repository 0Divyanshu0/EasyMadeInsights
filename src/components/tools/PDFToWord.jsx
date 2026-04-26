import { useState } from "react";

export default function PDFToWord() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setError("Please select a valid PDF file");
      return;
    }

    setFile(selectedFile);
    setError("");
  };

  const handleConvert = () => {
    if (!file) {
      setError("Please select a PDF file first");
      return;
    }

    // Placeholder: This would require a backend service to actually convert PDF to Word
    // For now, we'll show a message and create a sample document
    setMessage("PDF conversion feature coming soon! This will require a backend service.");
    
    // Create a simple placeholder document (downloadable text file for now)
    const text = `Converted from: ${file.name}\nConversion Date: ${new Date().toLocaleString()}\n\n[PDF content would be converted to Word format here]`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name.replace(".pdf", ".txt");
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

      <button
        className="convert-btn"
        onClick={handleConvert}
        disabled={!file}
      >
        Convert to Word
      </button>

      <div className="info-box">
        <p>
          <strong>Note:</strong> This feature requires a backend service for actual PDF to Word conversion.
          Currently, a placeholder document is downloaded.
        </p>
      </div>
    </div>
  );
}