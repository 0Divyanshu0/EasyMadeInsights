import { useState } from "react";
import FileUpload from "../components/FileUpload.jsx";
import KPI from "../components/KPI.jsx";
import ChartCard from "../components/ChartCard.jsx";

export default function Dashboard() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("");

  const kpiValues = selectedFile
    ? {
        totalRows: "Pending",
        numericColumns: "Pending",
        sheetsDetected: "Pending",
      }
    : {
        totalRows: "--",
        numericColumns: "--",
        sheetsDetected: "--",
      };

  const handleFile = (e) => {
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
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Excel insights, simplified</p>
          <h1>Upload a spreadsheet and turn raw data into a clear story.</h1>
          <p className="dashboard-copy">
            The current MVP validates uploads and prepares the dashboard shell.
            Next we can connect sheet parsing, KPI generation, charts, and AI
            explanations.
          </p>
        </div>

        {selectedFile && (
          <div className="selected-file-card">
            <span className="selected-file-label">Selected file</span>
            <strong>{selectedFile.name}</strong>
            <span className="selected-file-meta">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </span>
          </div>
        )}
      </section>

      <FileUpload handleFile={handleFile} />

      {message && (
        <div className={`status-banner ${messageType}`} role="status">
          {message}
        </div>
      )}

      <div className="dashboard-actions">
        <button
          className="reset-btn"
          onClick={resetDashboard}
          disabled={!selectedFile && !message}
        >
          Reset Dashboard
        </button>
      </div>

      <div className="kpi-grid">
        <KPI title="Total Rows" value={kpiValues.totalRows} />
        <KPI title="Numeric Columns" value={kpiValues.numericColumns} />
        <KPI title="Sheets Detected" value={kpiValues.sheetsDetected} />
      </div>

      <div className="chart-grid">
        <ChartCard title="Bar Chart">
          <span>
            Upload parsing is the next step. This area is ready for a chart
            library once workbook data is available.
          </span>
        </ChartCard>
        <ChartCard title="Line Chart">
          <span>
            Trend visuals can render here after we map date or category columns
            from the uploaded sheet.
          </span>
        </ChartCard>
      </div>
    </div>
  );
}
