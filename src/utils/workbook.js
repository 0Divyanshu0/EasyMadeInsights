const MAX_BAR_POINTS = 8;
const MAX_LINE_POINTS = 12;
const MAX_PIE_POINTS = 5;

export function cleanRows(rows) {
  if (!rows.length) return rows;

  // Remove rows where all values are null/undefined/empty
  let cleaned = rows.filter((row) =>
    Object.values(row).some(
      (val) => val !== null && val !== undefined && val !== ""
    )
  );

  if (!cleaned.length) return cleaned;

  // Get all columns
  const columns = Object.keys(cleaned[0]);

  // For each column, determine type and clean
  columns.forEach((col) => {
    const values = cleaned
      .map((row) => row[col])
      .filter((val) => val !== null && val !== undefined && val !== "");

    if (values.length === 0) return;

    const isNumeric = values.every(
      (val) => typeof val === "number" || (!isNaN(Number(val)) && val !== "")
    );

    if (isNumeric) {
      // Fill missing with mean
      const nums = values.map((v) => Number(v)).filter((n) => !isNaN(n));
      const mean = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

      cleaned.forEach((row) => {
        if (
          row[col] === null ||
          row[col] === undefined ||
          row[col] === "" ||
          isNaN(Number(row[col]))
        ) {
          row[col] = mean;
        } else {
          row[col] = Number(row[col]);
        }
      });
    } else {
      // Categorical: fill with mode or "Unknown"
      const freq = {};
      values.forEach((v) => {
        const str = String(v).trim();
        freq[str] = (freq[str] || 0) + 1;
      });
      const mode =
        Object.keys(freq).reduce((a, b) => (freq[a] > freq[b] ? a : b), null) ||
        "Unknown";

      cleaned.forEach((row) => {
        if (
          row[col] === null ||
          row[col] === undefined ||
          row[col] === ""
        ) {
          row[col] = mode;
        } else {
          row[col] = String(row[col]).trim();
        }
      });
    }
  });

  // Remove duplicate rows
  const seen = new Set();
  cleaned = cleaned.filter((row) => {
    const key = JSON.stringify(
      Object.keys(row)
        .sort()
        .reduce((obj, key) => {
          obj[key] = row[key];
          return obj;
        }, {})
    );
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return cleaned;
}

function isCurrencyLike(columnName) {
  return /revenue|sales|profit|amount|price|cost|spend|income|expense/i.test(
    columnName ?? ""
  );
}

function formatCompactNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatMetricValue(value, columnName) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  if (isCurrencyLike(columnName)) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }

  return formatCompactNumber(value);
}

export function formatMetricDisplay(value, columnName) {
  return formatMetricValue(value, columnName);
}

function sanitizeLabel(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") {
    return null;
  }

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseNumericValue(value) {
  return toNumber(value);
}

function toDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseDateValue(value) {
  return toDate(value);
}

function aggregateByColumn(rows, labelColumn, valueColumn) {
  const grouped = new Map();

  rows.forEach((row, index) => {
    const numericValue = toNumber(row[valueColumn]);
    if (numericValue === null) return;

    const label = sanitizeLabel(row[labelColumn], `Row ${index + 1}`);
    grouped.set(label, (grouped.get(label) ?? 0) + numericValue);
  });

  return Array.from(grouped.entries()).map(([label, value]) => ({
    label,
    value: Number(value.toFixed(2)),
  }));
}

function buildBarData(rows, categoryColumn, numericColumn) {
  if (!categoryColumn || !numericColumn) return [];

  return aggregateByColumn(rows, categoryColumn, numericColumn)
    .sort((a, b) => b.value - a.value)
    .slice(0, MAX_BAR_POINTS);
}

function buildLineData(rows, labelColumn, numericColumn) {
  if (!numericColumn) return [];

  const hasDateAxis = Boolean(labelColumn);

  if (hasDateAxis) {
    const grouped = new Map();

    rows.forEach((row) => {
      const numericValue = toNumber(row[numericColumn]);
      if (numericValue === null) return;

      const dateValue = toDate(row[labelColumn]);
      if (!dateValue) return;

      const dateKey = dateValue.toISOString().slice(0, 10);
      grouped.set(dateKey, (grouped.get(dateKey) ?? 0) + numericValue);
    });

    const dateSeries = Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(0, MAX_LINE_POINTS)
      .map(([label, value]) => ({
        label,
        value: Number(value.toFixed(2)),
      }));

    if (dateSeries.length > 1) {
      return dateSeries;
    }
  }

  return rows
    .map((row, index) => {
      const numericValue = toNumber(row[numericColumn]);
      if (numericValue === null) return null;

      const label = labelColumn
        ? sanitizeLabel(row[labelColumn], `Row ${index + 1}`)
        : `Row ${index + 1}`;

      return {
        label,
        value: Number(numericValue.toFixed(2)),
      };
    })
    .filter(Boolean)
    .slice(0, MAX_LINE_POINTS);
}

function buildMetricSummary(rows, numericColumn) {
  if (!numericColumn) {
    return null;
  }

  const values = rows
    .map((row) => toNumber(row[numericColumn]))
    .filter((value) => value !== null);

  if (!values.length) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  const average = total / values.length;
  const highest = Math.max(...values);
  const lowest = Math.min(...values);

  return {
    column: numericColumn,
    total,
    average,
    highest,
    lowest,
    totalDisplay: formatMetricValue(total, numericColumn),
    averageDisplay: formatMetricValue(average, numericColumn),
    highestDisplay: formatMetricValue(highest, numericColumn),
    lowestDisplay: formatMetricValue(lowest, numericColumn),
  };
}

function buildTopCategory(barData, metricSummary) {
  if (!barData.length) {
    return null;
  }

  const [topEntry] = barData;
  const share = metricSummary?.total
    ? `${((topEntry.value / metricSummary.total) * 100).toFixed(1)}%`
    : null;

  return {
    label: topEntry.label,
    value: topEntry.value,
    valueDisplay: formatMetricValue(topEntry.value, metricSummary?.column),
    share,
  };
}

function buildNarrativeInsights({
  rowCount,
  primaryMetric,
  metricSummary,
  topCategory,
  primaryDate,
  momentum,
}) {
  const insights = [];

  if (metricSummary) {
    insights.push(
      `${primaryMetric} totals ${metricSummary.totalDisplay} across ${rowCount.toLocaleString()} records.`
    );
    insights.push(
      `The average ${primaryMetric} per record is ${metricSummary.averageDisplay}.`
    );
  }

  if (topCategory) {
    insights.push(
      `${topCategory.label} is the strongest segment at ${topCategory.valueDisplay}${topCategory.share ? `, contributing ${topCategory.share} of the measured total` : ""}.`
    );
  }

  if (momentum?.direction) {
    insights.push(
      `${primaryMetric} is currently ${momentum.direction} by ${momentum.changeDisplay} versus the previous plotted point.`
    );
  } else if (primaryDate) {
    insights.push(
      `A time-based field was detected in ${primaryDate}, so trend analysis is available for this sheet.`
    );
  }

  return insights.slice(0, 3);
}

function buildPieData(barData) {
  if (!barData.length) {
    return [];
  }

  const visible = barData.slice(0, MAX_PIE_POINTS);
  const remainder = barData.slice(MAX_PIE_POINTS);
  const otherValue = remainder.reduce((sum, item) => sum + item.value, 0);

  const pieData = [...visible];

  if (otherValue > 0) {
    pieData.push({
      label: "Other",
      value: Number(otherValue.toFixed(2)),
    });
  }

  return pieData;
}

function buildTrendComparison(rows, labelColumn, primaryMetric, secondaryMetric) {
  if (!primaryMetric || !secondaryMetric || !labelColumn) {
    return [];
  }

  const grouped = new Map();

  rows.forEach((row, index) => {
    const primaryValue = toNumber(row[primaryMetric]);
    const secondaryValue = toNumber(row[secondaryMetric]);

    if (primaryValue === null && secondaryValue === null) {
      return;
    }

    const dateValue = toDate(row[labelColumn]);
    const label = dateValue
      ? dateValue.toISOString().slice(0, 10)
      : sanitizeLabel(row[labelColumn], `Row ${index + 1}`);

    const existing = grouped.get(label) ?? {
      label,
      primary: 0,
      secondary: 0,
    };

    existing.primary += primaryValue ?? 0;
    existing.secondary += secondaryValue ?? 0;
    grouped.set(label, existing);
  });

  return Array.from(grouped.values())
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(0, MAX_LINE_POINTS)
    .map((item) => ({
      label: item.label,
      primary: Number(item.primary.toFixed(2)),
      secondary: Number(item.secondary.toFixed(2)),
    }));
}

function buildMomentum(lineData, metricColumn) {
  if (lineData.length < 2) {
    return null;
  }

  const previous = lineData[lineData.length - 2];
  const current = lineData[lineData.length - 1];
  const change = current.value - previous.value;
  const direction = change === 0 ? "flat" : change > 0 ? "up" : "down";

  return {
    direction,
    change,
    changeDisplay: formatMetricValue(Math.abs(change), metricColumn),
    currentLabel: current.label,
    currentValue: current.value,
  };
}

function buildCategoryHighlights(barData, metricColumn) {
  if (!barData.length) {
    return [];
  }

  return barData.slice(0, 3).map((item, index) => ({
    rank: index + 1,
    label: item.label,
    value: item.value,
    valueDisplay: formatMetricValue(item.value, metricColumn),
  }));
}

function buildDataHealth(columns, rowCount, numericColumns, categoryColumns, dateColumns) {
  const chartReadiness =
    numericColumns.length > 0 && (categoryColumns.length > 0 || dateColumns.length > 0);

  return {
    columns: columns.length,
    rowCount,
    chartReadiness,
    profile:
      rowCount > 0
        ? `${numericColumns.length} numeric, ${categoryColumns.length} category, ${dateColumns.length} date`
        : "No populated rows detected",
  };
}

export function analyzeSheet(name, rows) {
  const populatedRows = rows.filter((row) =>
    Object.values(row).some((value) => value !== null && value !== undefined && value !== "")
  );

  const columns = Object.keys(populatedRows[0] ?? {});

  const columnMeta = columns.map((column) => {
    let numericCount = 0;
    let dateCount = 0;
    let textCount = 0;

    populatedRows.forEach((row) => {
      const value = row[column];
      if (value === null || value === undefined || value === "") return;

      if (toNumber(value) !== null) {
        numericCount += 1;
        return;
      }

      if (toDate(value)) {
        dateCount += 1;
        return;
      }

      textCount += 1;
    });

    return {
      column,
      numericCount,
      dateCount,
      textCount,
    };
  });

  const numericColumns = columnMeta
    .filter((item) => item.numericCount > 0)
    .map((item) => item.column);
  const dateColumns = columnMeta
    .filter((item) => item.dateCount > 0)
    .map((item) => item.column);
  const categoryColumns = columnMeta
    .filter((item) => item.textCount > 0)
    .map((item) => item.column);

  const primaryMetric = numericColumns[0] ?? null;
  const secondaryMetric = numericColumns[1] ?? null;
  const primaryCategory = categoryColumns[0] ?? columns[0] ?? null;
  const primaryDate = dateColumns[0] ?? null;
  const barData = buildBarData(populatedRows, primaryCategory, primaryMetric);
  const pieData = buildPieData(barData);
  const lineData = buildLineData(
    populatedRows,
    primaryDate ?? primaryCategory,
    primaryMetric
  );
  const metricSummary = buildMetricSummary(populatedRows, primaryMetric);
  const topCategory = buildTopCategory(barData, metricSummary);
  const trendComparison = buildTrendComparison(
    populatedRows,
    primaryDate ?? primaryCategory,
    primaryMetric,
    secondaryMetric
  );
  const momentum = buildMomentum(lineData, primaryMetric);
  const categoryHighlights = buildCategoryHighlights(barData, primaryMetric);
  const dataHealth = buildDataHealth(
    columns,
    populatedRows.length,
    numericColumns,
    categoryColumns,
    dateColumns
  );

  return {
    name,
    rows: populatedRows,
    previewRows: populatedRows.slice(0, 6),
    columns,
    rowCount: populatedRows.length,
    numericColumns,
    numericColumnCount: numericColumns.length,
    dateColumns,
    categoryColumns,
    primaryMetric,
    secondaryMetric,
    primaryCategory,
    primaryDate,
    barData,
    pieData,
    lineData,
    trendComparison,
    metricSummary,
    momentum,
    topCategory,
    categoryHighlights,
    dataHealth,
    narrativeInsights: buildNarrativeInsights({
      rowCount: populatedRows.length,
      primaryMetric,
      metricSummary,
      topCategory,
      primaryDate,
      momentum,
    }),
  };
}

export function buildWorkbookSummary(sheetMap) {
  const sheets = Object.values(sheetMap);
  const totalRows = sheets.reduce((sum, sheet) => sum + sheet.rowCount, 0);
  const numericColumns = sheets.reduce(
    (sum, sheet) => sum + sheet.numericColumnCount,
    0
  );

  return {
    totalRows,
    numericColumns,
    sheetCount: sheets.length,
  };
}

export function buildAiInsightPayload(sheet) {
  if (!sheet) {
    return null;
  }

  return {
    sheet_name: sheet.name,
    row_count: sheet.rowCount,
    column_count: sheet.columns.length,
    columns: sheet.columns,
    numeric_columns: sheet.numericColumns,
    category_columns: sheet.categoryColumns,
    date_columns: sheet.dateColumns,
    primary_metric: sheet.primaryMetric,
    primary_category: sheet.primaryCategory,
    primary_date: sheet.primaryDate,
    metric_summary: sheet.metricSummary
      ? {
          metric: sheet.metricSummary.column,
          total: sheet.metricSummary.total,
          average: sheet.metricSummary.average,
          highest: sheet.metricSummary.highest,
          lowest: sheet.metricSummary.lowest,
          total_display: sheet.metricSummary.totalDisplay,
          average_display: sheet.metricSummary.averageDisplay,
          highest_display: sheet.metricSummary.highestDisplay,
          lowest_display: sheet.metricSummary.lowestDisplay,
        }
      : null,
    top_category: sheet.topCategory,
    chart_summary: {
      category_performance: sheet.barData.slice(0, 5),
      trend_overview: sheet.lineData.slice(0, 8),
    },
    narrative_hints: sheet.narrativeInsights,
    preview_rows: sheet.previewRows,
  };
}
