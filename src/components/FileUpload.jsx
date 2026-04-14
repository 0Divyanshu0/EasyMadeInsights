import { useRef } from "react";

export default function FileUpload({ handleFile }) {
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile({ target: { files: [file] } });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div
      className="upload-box drag-drop"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
      onClick={() => fileInputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Upload an Excel file"
    >
      <p className="upload-badge">Excel Upload</p>
      <p className="upload-title">Drag and drop your Excel file here</p>
      <p className="upload-sub">or click to browse .xlsx and .xls files</p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFile}
        hidden
      />
    </div>
  );
}
