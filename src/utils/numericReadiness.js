import { parseNumericValue } from "./workbook.js";

const MIN_ROW_COVERAGE = 0.5;
const MIN_NUMERIC_CONSISTENCY = 0.8;

function hasValue(value) {
  return value !== null && value !== undefined && (typeof value !== "string" || value.trim() !== "");
}

function isContextColumn(column) {
  const name = column.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (column.trim() === "#") return true;
  if (/\b(id|ids|identifier|identifiers|code|codes|sku|isbn|uuid|guid|iban|imei|zipcode)\b/.test(name)) return true;
  if (/^(no|num|number|index|row|row number|row no|s no|sl no|sr no|serial(?: number| no)?|record number)$/.test(name)) return true;
  if (/\b(account|invoice|order|reference|employee|customer|roll) (number|no|num)$/.test(name)) return true;
  if (/\b(phone|telephone|mobile|fax)(?: number| no)?$/.test(name)) return true;
  if (/^(date|dates|datetime|timestamp|timestamps|year|month|day|time|dob|date of birth)$|\b(date|datetime|timestamp|dob)$|^(fiscal|calendar|reporting) (year|month|day)$/.test(name)) return true;
  return /\b(name|names|notes|description|comments|remarks|address|email|url|website|status|category|region|department|title)$/.test(name);
}

// Advisory only: inspect original cells without changing cleaning or analytics.
export function assessNumericReadiness(rows) {
  const columns = new Map();
  let rowCount = 0;
  for (const row of rows) {
    if (!Object.values(row).some(hasValue)) continue;
    rowCount += 1;
    for (const [column, value] of Object.entries(row)) {
      if (!hasValue(value)) continue;
      const profile = columns.get(column) ?? { column, populated: 0, numeric: 0, context: isContextColumn(column) };
      profile.populated += 1;
      if (parseNumericValue(value) !== null) profile.numeric += 1;
      columns.set(column, profile);
    }
  }

  const numeric = [...columns.values()].filter((profile) => profile.numeric > 0);
  const measures = numeric.filter((profile) => !profile.context);
  const reliable = measures.filter((profile) =>
    profile.numeric / rowCount >= MIN_ROW_COVERAGE && profile.numeric / profile.populated >= MIN_NUMERIC_CONSISTENCY
  );
  let reason = null;
  let message = "";
  if (!rowCount) {
    reason = "empty-sheet";
    message = "This worksheet has no populated rows, so there is little data available for numeric evaluation.";
  } else if (!numeric.length) {
    reason = "no-numeric-values";
    message = "This sheet looks mostly textual or descriptive. Totals, averages, and numeric comparisons may be limited.";
  } else if (!measures.length) {
    reason = "context-only-numbers";
    message = "The numeric fields appear to be identifiers, dates, or descriptive labels rather than measurements. Numeric insights may not be meaningful.";
  } else if (!reliable.length) {
    reason = "sparse-numeric-values";
    message = "Numeric values are sparse or mixed with text in this sheet. Totals, averages, and comparisons may give an incomplete picture.";
  }

  return {
    rowCount,
    numericColumnCount: numeric.length,
    measurementColumnCount: measures.length,
    reliableNumericColumnCount: reliable.length,
    warning: reason ? { reason, message } : null,
  };
}
