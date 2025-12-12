import { useState } from "react";
import FileUpload from "../components/FileUpload.jsx";
import KPI from "../components/KPI.jsx";
import ChartCard from "../components/ChartCard.jsx";

export default function Dashboard() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(""); // "success" | "error"

  const handleFile = (e) => {
    // clear previous message
    setMessage(null);
    setMessageType("");

    const file = e.target.files[0];
    if (!file) return;

    const isExcel =
      file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (!isExcel) {
      setSelectedFile(null);
      setMessage("Invalid file format. Please upload an Excel file.");
      setMessageType("error");
      return;
    }

    setSelectedFile(file);
    setMessage("File uploaded successfully.");
    setMessageType("success");

    console.log("User uploaded:", file);
  };

  const resetDashboard = () => {
    setSelectedFile(null);
    setMessage(null);
    setMessageType("");
  };

  return (
    <div className="dashboard container">
      <FileUpload handleFile={handleFile} />

      {/* Status Message */}
      {message && (
        <div className={`status-banner ${messageType}`}>
          {message}
        </div>
      )}

      {/* Reset Button */}
      <button className="reset-btn" onClick={resetDashboard}>
        Reset Dashboard
      </button>

      {/* KPI Section */}
      <div className="kpi-grid">
        <KPI title="Total Rows" value="—" />
        <KPI title="Numeric Columns" value="—" />
        <KPI title="Sheets Detected" value="—" />
      </div>

      {/* Chart Section */}
      <div className="chart-grid">
        <ChartCard title="Bar Chart" />
        <ChartCard title="Line Chart" />
      </div>

      {selectedFile && (
        <div style={{ marginTop: "20px", fontSize: "14px" }}>
          <strong>Selected File:</strong> {selectedFile.name}
        </div>
      )}
    </div>
  );
}
