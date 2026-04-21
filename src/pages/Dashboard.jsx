import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AIInsightsPanel from "../components/AIInsightsPanel.jsx";
import ChartCard from "../components/ChartCard.jsx";
import FileUpload from "../components/FileUpload.jsx";
import KPI from "../components/KPI.jsx";
import Loader from "../components/Loader.jsx";
import SheetSelector from "../components/SheetSelector.jsx";
import {
  analyzeSheet,
  buildWorkbookSummary,
  formatMetricDisplay,
  parseDateValue,
  parseNumericValue,
} from "../utils/workbook.js";

const PIE_COLORS = ["#2563eb", "#0ea5e9", "#38bdf8", "#60a5fa", "#93c5fd", "#cbd5e1"];

function formatMetricValue(value) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  return value.toLocaleString();
}

function buildAggregateSeries(rows, labelColumn, metricColumn, limit = 8) {
  if (!rows.length || !labelColumn || !metricColumn) {
    return [];
  }

  const grouped = new Map();

  rows.forEach((row, index) => {
    const metricValue = parseNumericValue(row[metricColumn]);
    if (metricValue === null) {
      return;
    }

    const rawLabel = row[labelColumn];
    const dateLabel = parseDateValue(rawLabel);
    const label = dateLabel
      ? dateLabel.toISOString().slice(0, 10)
      : String(rawLabel || `Row ${index + 1}`);

    grouped.set(label, (grouped.get(label) ?? 0) + metricValue);
  });

  return Array.from(grouped.entries())
    .map(([label, value]) => ({
      label,
      value: Number(value.toFixed(2)),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function buildTrendSeries(rows, labelColumn, metricColumn, limit = 12) {
  if (!rows.length || !labelColumn || !metricColumn) {
    return [];
  }

  const grouped = new Map();

  rows.forEach((row, index) => {
    const metricValue = parseNumericValue(row[metricColumn]);
    if (metricValue === null) {
      return;
    }

    const rawLabel = row[labelColumn];
    const dateLabel = parseDateValue(rawLabel);
    const label = dateLabel
      ? dateLabel.toISOString().slice(0, 10)
      : String(rawLabel || `Row ${index + 1}`);

    grouped.set(label, (grouped.get(label) ?? 0) + metricValue);
  });

  return Array.from(grouped.entries())
    .map(([label, value]) => ({
      label,
      value: Number(value.toFixed(2)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(0, limit);
}

function buildComparisonSeries(rows, labelColumn, primaryMetric, secondaryMetric, limit = 12) {
  if (!rows.length || !labelColumn || !primaryMetric || !secondaryMetric) {
    return [];
  }

  const grouped = new Map();

  rows.forEach((row, index) => {
    const primaryValue = parseNumericValue(row[primaryMetric]);
    const secondaryValue = parseNumericValue(row[secondaryMetric]);

    if (primaryValue === null && secondaryValue === null) {
      return;
    }

    const rawLabel = row[labelColumn];
    const dateLabel = parseDateValue(rawLabel);
    const label = dateLabel
      ? dateLabel.toISOString().slice(0, 10)
      : String(rawLabel || `Row ${index + 1}`);

    const current = grouped.get(label) ?? {
      label,
      primary: 0,
      secondary: 0,
    };

    current.primary += primaryValue ?? 0;
    current.secondary += secondaryValue ?? 0;
    grouped.set(label, current);
  });

  return Array.from(grouped.values())
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((item) => ({
      ...item,
      primary: Number(item.primary.toFixed(2)),
      secondary: Number(item.secondary.toFixed(2)),
    }));
}

function createSectionObserver(sectionRefs, onSectionChange) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visibleEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visibleEntry?.target?.id) {
        onSectionChange(visibleEntry.target.id);
      }
    },
    {
      root: null,
      threshold: [0.2, 0.45, 0.7],
      rootMargin: "-10% 0px -55% 0px",
    }
  );

  sectionRefs.forEach((ref) => {
    if (ref.current) {
      observer.observe(ref.current);
    }
  });

  return observer;
}

export default function Dashboard({ onSectionChange }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);
  const [workbookData, setWorkbookData] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [selectedMetric, setSelectedMetric] = useState("");
  const [selectedBreakdown, setSelectedBreakdown] = useState("");
  const [selectedTrendDimension, setSelectedTrendDimension] = useState("");
  const [selectedComparisonMetric, setSelectedComparisonMetric] = useState("");
  const [performanceChartType, setPerformanceChartType] = useState("bar");
  const [trendChartType, setTrendChartType] = useState("area");

  const uploadRef = useRef(null);
  const overviewRef = useRef(null);
  const visualBuilderRef = useRef(null);
  const insightsRef = useRef(null);
  const previewRef = useRef(null);

  const activeSheet = workbookData?.sheets[selectedSheet] ?? null;
  const hasUnsavedSession = Boolean(selectedFile || workbookData);

  useEffect(() => {
    if (!hasUnsavedSession) {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue =
        "Your uploaded workbook and generated insights will be lost if you refresh or leave this page.";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedSession]);

  useEffect(() => {
    const observer = createSectionObserver(
      [uploadRef, overviewRef, visualBuilderRef, insightsRef, previewRef],
      onSectionChange
    );

    return () => observer.disconnect();
  }, [onSectionChange]);

  useEffect(() => {
    if (!activeSheet) {
      return;
    }

    setSelectedMetric((current) =>
      activeSheet.numericColumns.includes(current)
        ? current
        : activeSheet.primaryMetric ?? ""
    );

    const dimensionOptions = [
      ...activeSheet.categoryColumns,
      ...activeSheet.dateColumns.filter(
        (column) => !activeSheet.categoryColumns.includes(column)
      ),
    ];

    setSelectedBreakdown((current) =>
      dimensionOptions.includes(current)
        ? current
        : activeSheet.primaryCategory ?? activeSheet.primaryDate ?? ""
    );

    const trendOptions = [
      ...activeSheet.dateColumns,
      ...activeSheet.categoryColumns.filter(
        (column) => !activeSheet.dateColumns.includes(column)
      ),
    ];

    setSelectedTrendDimension((current) =>
      trendOptions.includes(current)
        ? current
        : activeSheet.primaryDate ?? activeSheet.primaryCategory ?? ""
    );

    setSelectedComparisonMetric((current) =>
      activeSheet.numericColumns.includes(current) && current !== activeSheet.primaryMetric
        ? current
        : activeSheet.secondaryMetric ?? activeSheet.numericColumns[1] ?? ""
    );
  }, [activeSheet]);

  const chartData = useMemo(() => {
    if (!activeSheet) {
      return {
        performance: [],
        trend: [],
        comparison: [],
        share: [],
      };
    }

    const performance = buildAggregateSeries(
      activeSheet.rows,
      selectedBreakdown,
      selectedMetric
    );
    const trend = buildTrendSeries(
      activeSheet.rows,
      selectedTrendDimension,
      selectedMetric
    );
    const comparison = buildComparisonSeries(
      activeSheet.rows,
      selectedTrendDimension,
      selectedMetric,
      selectedComparisonMetric
    );

    const shareBase = performance.slice(0, 5);
    const shareTotal = shareBase.reduce((sum, item) => sum + item.value, 0);
    const share = shareBase.map((item) => ({
      ...item,
      share: shareTotal ? `${((item.value / shareTotal) * 100).toFixed(1)}%` : "--",
    }));

    return {
      performance,
      trend,
      comparison,
      share,
    };
  }, [
    activeSheet,
    selectedBreakdown,
    selectedComparisonMetric,
    selectedMetric,
    selectedTrendDimension,
  ]);

  const kpiValues = workbookData
    ? {
        totalRows: formatMetricValue(
          activeSheet?.rowCount ?? workbookData.summary.totalRows
        ),
        numericColumns: formatMetricValue(
          activeSheet?.numericColumnCount ?? workbookData.summary.numericColumns
        ),
        sheetsDetected: formatMetricValue(workbookData.summary.sheetCount),
        primaryMeasure:
          activeSheet && selectedMetric
            ? formatMetricDisplay(
                activeSheet.rows.reduce((sum, row) => {
                  const numericValue = parseNumericValue(row[selectedMetric]);
                  return sum + (numericValue ?? 0);
                }, 0),
                selectedMetric
              )
            : "--",
      }
    : {
        totalRows: "--",
        numericColumns: "--",
        sheetsDetected: "--",
        primaryMeasure: "--",
      };

  const handleFile = async (e) => {
    setMessage(null);
    setMessageType("");

    const file = e.target.files[0];
    if (!file) return;

    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (!isExcel) {
      setSelectedFile(null);
      setWorkbookData(null);
      setSelectedSheet("");
      setMessage("Invalid file format. Please upload an Excel file.");
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

      const sheets = Object.fromEntries(
        workbook.SheetNames.map((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, {
            defval: "",
            raw: true,
          });

          return [sheetName, analyzeSheet(sheetName, rows)];
        })
      );

      const firstSheetName = workbook.SheetNames[0] ?? "";
      const summary = buildWorkbookSummary(sheets);

      setSelectedFile(file);
      setWorkbookData({
        sheets,
        sheetNames: workbook.SheetNames,
        summary,
      });
      setSelectedSheet(firstSheetName);
      setMessage(
        `Workbook analyzed successfully. ${workbook.SheetNames.length} sheet(s) ready.`
      );
      setMessageType("success");
    } catch (error) {
      console.error(error);
      setSelectedFile(null);
      setWorkbookData(null);
      setSelectedSheet("");
      setMessage(
        "We could not read that workbook. Please try a different Excel file."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleAiUpcomingNotice = () => {
    setMessage(
      "AI executive summaries are still in progress and will be added as an upcoming feature."
    );
    setMessageType("info");
  };

  const resetDashboard = () => {
    setSelectedFile(null);
    setMessage(null);
    setMessageType("");
    setWorkbookData(null);
    setSelectedSheet("");
    setLoading(false);
  };

  return (
    <div className="dashboard container">
      <section className="dashboard-hero dashboard-section" id="upload" ref={uploadRef}>
        <div>
          <p className="eyebrow">Excel insights, simplified</p>
          <h1>Upload a spreadsheet and bend the report to fit the question.</h1>
          <p className="dashboard-copy">
            The dashboard now has section navigation and a visual builder so
            users can choose the metric, breakdown, comparison, and chart style
            that best fits the report they want to create.
          </p>
        </div>

        {selectedFile && (
          <div className="selected-file-card">
            <span className="selected-file-label">Selected file</span>
            <strong>{selectedFile.name}</strong>
            <span className="selected-file-meta">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </span>
            {activeSheet && (
              <span className="selected-file-meta">
                Active sheet: {activeSheet.name}
              </span>
            )}
          </div>
        )}
      </section>

      <FileUpload handleFile={handleFile} />

      {loading && <Loader />}

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

      {workbookData && (
        <SheetSelector
          sheets={workbookData.sheetNames}
          value={selectedSheet}
          onSelect={setSelectedSheet}
        />
      )}

      <section id="overview" ref={overviewRef} className="dashboard-section">
        <div className="section-heading">
          <p className="eyebrow">Overview</p>
          <h2>Quick read on the active sheet</h2>
        </div>

        <div className="kpi-grid">
          <KPI
            title="Total Rows"
            value={kpiValues.totalRows}
            detail="Records available in the active sheet."
          />
          <KPI
            title="Numeric Columns"
            value={kpiValues.numericColumns}
            detail="Measures detected for summaries and charts."
          />
          <KPI
            title="Sheets Detected"
            value={kpiValues.sheetsDetected}
            detail="Tabs successfully parsed from the workbook."
          />
          <KPI
            title={selectedMetric ? `${selectedMetric} Total` : "Primary Measure"}
            value={kpiValues.primaryMeasure}
            detail={
              selectedMetric
                ? "Currently calculated from the metric selected in the visual builder."
                : "Upload a dataset with numeric measures to generate a summary."
            }
          />
        </div>

        {activeSheet && (
          <section className="spotlight-grid">
            <article className="spotlight-card">
              <span className="spotlight-label">Top Segment</span>
              <strong>{activeSheet.topCategory?.label ?? "Not found"}</strong>
              <p>
                {activeSheet.topCategory?.valueDisplay ?? "--"}
                {activeSheet.topCategory?.share
                  ? ` | ${activeSheet.topCategory.share} of total`
                  : ""}
              </p>
            </article>
            <article className="spotlight-card">
              <span className="spotlight-label">Momentum</span>
              <strong>
                {activeSheet.momentum
                  ? activeSheet.momentum.direction.toUpperCase()
                  : "Stable"}
              </strong>
              <p>
                {activeSheet.momentum
                  ? `${activeSheet.momentum.changeDisplay} vs previous point`
                  : "Not enough trend points to compare"}
              </p>
            </article>
            <article className="spotlight-card">
              <span className="spotlight-label">Data Profile</span>
              <strong>{activeSheet.dataHealth.columns} columns</strong>
              <p>{activeSheet.dataHealth.profile}</p>
            </article>
          </section>
        )}
      </section>

      <section
        id="visual-builder"
        ref={visualBuilderRef}
        className="dashboard-section"
      >
        <div className="section-heading">
          <p className="eyebrow">Visual Builder</p>
          <h2>Customize the report</h2>
          <p className="section-copy">
            Choose the measure, grouping field, trend axis, and chart styles to
            shape the report around what the user actually needs.
          </p>
        </div>

        {activeSheet && (
          <div className="builder-panel">
            <div className="builder-control">
              <label htmlFor="metric-select">Metric</label>
              <select
                id="metric-select"
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
              >
                {activeSheet.numericColumns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
            </div>

            <div className="builder-control">
              <label htmlFor="breakdown-select">Breakdown</label>
              <select
                id="breakdown-select"
                value={selectedBreakdown}
                onChange={(e) => setSelectedBreakdown(e.target.value)}
              >
                {[...activeSheet.categoryColumns, ...activeSheet.dateColumns]
                  .filter((column, index, array) => array.indexOf(column) === index)
                  .map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
              </select>
            </div>

            <div className="builder-control">
              <label htmlFor="trend-select">Trend Axis</label>
              <select
                id="trend-select"
                value={selectedTrendDimension}
                onChange={(e) => setSelectedTrendDimension(e.target.value)}
              >
                {[...activeSheet.dateColumns, ...activeSheet.categoryColumns]
                  .filter((column, index, array) => array.indexOf(column) === index)
                  .map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
              </select>
            </div>

            <div className="builder-control">
              <label htmlFor="comparison-metric-select">Comparison Metric</label>
              <select
                id="comparison-metric-select"
                value={selectedComparisonMetric}
                onChange={(e) => setSelectedComparisonMetric(e.target.value)}
              >
                <option value="">None</option>
                {activeSheet.numericColumns
                  .filter((column) => column !== selectedMetric)
                  .map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
              </select>
            </div>

            <div className="builder-control">
              <label htmlFor="performance-chart-select">Performance Chart</label>
              <select
                id="performance-chart-select"
                value={performanceChartType}
                onChange={(e) => setPerformanceChartType(e.target.value)}
              >
                <option value="bar">Bar</option>
                <option value="line">Line</option>
                <option value="pie">Donut</option>
              </select>
            </div>

            <div className="builder-control">
              <label htmlFor="trend-chart-select">Trend Chart</label>
              <select
                id="trend-chart-select"
                value={trendChartType}
                onChange={(e) => setTrendChartType(e.target.value)}
              >
                <option value="area">Area</option>
                <option value="line">Line</option>
                <option value="bars">Columns</option>
              </select>
            </div>
          </div>
        )}

        <div className="chart-grid chart-grid-rich">
          <ChartCard
            title="Performance View"
            subtitle={selectedBreakdown || "Select a breakdown field"}
          >
            {chartData.performance.length ? (
              performanceChartType === "pie" ? (
                <div className="chart-flex">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={chartData.share}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={62}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {chartData.share.map((entry, index) => (
                          <Cell
                            key={entry.label}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mini-legend">
                    {chartData.share.map((entry, index) => (
                      <div className="mini-legend-row" key={entry.label}>
                        <span
                          className="mini-legend-dot"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        ></span>
                        <span className="mini-legend-label">{entry.label}</span>
                        <strong>{entry.share}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : performanceChartType === "line" ? (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={chartData.performance}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData.performance}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )
            ) : (
              <span>Select a valid metric and breakdown to build a chart.</span>
            )}
          </ChartCard>

          <ChartCard
            title="Trend View"
            subtitle={selectedTrendDimension || "Select a trend axis"}
          >
            {chartData.trend.length ? (
              trendChartType === "line" ? (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={chartData.trend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : trendChartType === "bars" ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData.trend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData.trend}>
                    <defs>
                      <linearGradient id="builderTrendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#2563eb"
                      strokeWidth={3}
                      fill="url(#builderTrendFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )
            ) : (
              <span>Select a valid metric and trend dimension to build a trend chart.</span>
            )}
          </ChartCard>

          <ChartCard
            title="Comparison View"
            subtitle={
              selectedComparisonMetric
                ? `${selectedMetric} vs ${selectedComparisonMetric}`
                : "Choose a second metric for comparison"
            }
          >
            {chartData.comparison.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData.comparison}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="primary" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="secondary"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <span>
                Choose a second numeric measure to compare both series on the
                same axis.
              </span>
            )}
          </ChartCard>

          <ChartCard title="Share Breakdown" subtitle="Top contributors">
            {chartData.share.length ? (
              <div className="share-table">
                {chartData.share.map((entry, index) => (
                  <div className="share-row" key={entry.label}>
                    <div className="share-row-main">
                      <span
                        className="mini-legend-dot"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      ></span>
                      <span className="share-label">{entry.label}</span>
                    </div>
                    <strong>{entry.share}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <span>Grouped share percentages will appear once a breakdown is selected.</span>
            )}
          </ChartCard>
        </div>
      </section>

      <section id="preview" ref={previewRef} className="dashboard-section">
        <div className="section-heading">
          <p className="eyebrow">Preview</p>
          <h2>Data preview and worksheet details</h2>
        </div>

        {activeSheet && (
          <section className="insights-grid">
            <div className="insight-card">
              <h3>Worksheet Health</h3>
              <div className="summary-stat-list">
                <div className="summary-stat">
                  <span className="summary-label">Rows</span>
                  <strong>{activeSheet.rowCount}</strong>
                </div>
                <div className="summary-stat">
                  <span className="summary-label">Categories</span>
                  <strong>{activeSheet.categoryColumns.length}</strong>
                </div>
                <div className="summary-stat">
                  <span className="summary-label">Dates</span>
                  <strong>{activeSheet.dateColumns.length}</strong>
                </div>
                <div className="summary-stat">
                  <span className="summary-label">Chart ready</span>
                  <strong>{activeSheet.dataHealth.chartReadiness ? "Yes" : "Limited"}</strong>
                </div>
              </div>
            </div>

            <div className="insight-card insight-card-wide">
              <h3>Data preview</h3>
              {activeSheet.previewRows.length ? (
                <div className="preview-table-wrap">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        {activeSheet.columns.slice(0, 6).map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeSheet.previewRows.map((row, rowIndex) => (
                        <tr key={`${activeSheet.name}-${rowIndex}`}>
                          {activeSheet.columns.slice(0, 6).map((column) => (
                            <td key={`${rowIndex}-${column}`}>
                              {String(row[column] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No rows were found in this sheet.</p>
              )}
            </div>
          </section>
        )}
      </section>

      <section id="insights" ref={insightsRef} className="dashboard-section">
        <div className="section-heading">
          <p className="eyebrow">Insights</p>
          <h2>Interpretation and guided takeaways</h2>
        </div>

        <AIInsightsPanel
          onNotify={handleAiUpcomingNotice}
          disabled={!activeSheet}
        />

        {activeSheet && (
          <section className="insights-grid">
            <div className="insight-card">
              <h3>Executive Summary</h3>
              <div className="summary-stat-list">
                <div className="summary-stat">
                  <span className="summary-label">Columns</span>
                  <strong>{activeSheet.columns.length}</strong>
                </div>
                <div className="summary-stat">
                  <span className="summary-label">Primary metric</span>
                  <strong>{activeSheet.primaryMetric ?? "Not found"}</strong>
                </div>
                <div className="summary-stat">
                  <span className="summary-label">Top segment</span>
                  <strong>{activeSheet.topCategory?.label ?? "Not found"}</strong>
                </div>
                <div className="summary-stat">
                  <span className="summary-label">Best value</span>
                  <strong>{activeSheet.topCategory?.valueDisplay ?? "--"}</strong>
                </div>
              </div>
            </div>

            <div className="insight-card">
              <h3>Key Insights</h3>
              {activeSheet.narrativeInsights.length ? (
                <ul className="insight-list">
                  {activeSheet.narrativeInsights.map((insight) => (
                    <li key={insight}>{insight}</li>
                  ))}
                </ul>
              ) : (
                <p>
                  Add more structured numeric and category columns to generate
                  stronger insights.
                </p>
              )}
            </div>

            <div className="insight-card">
              <h3>Top Performers</h3>
              {chartData.performance.length ? (
                <div className="leaderboard">
                  {chartData.performance.slice(0, 3).map((item, index) => (
                    <div className="leaderboard-row" key={item.label}>
                      <span className="leaderboard-rank">#{index + 1}</span>
                      <span className="leaderboard-name">{item.label}</span>
                      <strong>{formatMetricDisplay(item.value, selectedMetric)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No ranked category performance is available yet.</p>
              )}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
