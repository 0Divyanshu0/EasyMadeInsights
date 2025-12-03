import { useState } from "react";
import FileUpload from "../components/FileUpload.jsx";
import KPI from "../components/KPI.jsx";


export default function Dashboard() {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    console.log("User uploaded:", file);
  };

  return (
    <div className="dashboard container">
      <FileUpload handleFile={handleFile} />

       {/* KPI Section */}
    <div className="kpi-grid">
      <KPI title="Total Rows" value="—" />
      <KPI title="Numeric Columns" value="—" />
      <KPI title="Sheets Detected" value="—" />
    </div>

      {selectedFile && (
        <div style={{ marginTop: "20px", fontSize: "14px" }}>
          <strong>Selected File:</strong> {selectedFile.name}
        </div>
      )}
    </div>
  );
}
