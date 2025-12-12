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
      onClick={() => fileInputRef.current.click()}
    >
      <p className="upload-icon">📊</p>
      <p className="upload-title">Drag & Drop your Excel file here</p>
      <p className="upload-sub">or click to browse (.xlsx, .xls)</p>

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
