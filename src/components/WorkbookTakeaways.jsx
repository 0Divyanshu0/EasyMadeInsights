import { formatMetricDisplay, parseNumericValue } from "../utils/workbook.js";

export default function WorkbookTakeaways({ sheet, metric, breakdown }) {
  const values = sheet && metric ? sheet.rows.map((row) => parseNumericValue(row[metric])).filter((value) => value !== null) : [];
  if (!values.length) return <div className="takeaways">
    <div className="takeaways-header"><h3>Workbook takeaways</h3><span className="local-analysis-badge">Local analysis</span></div>
    <p className="takeaways-context">Upload a worksheet with numeric data to see measure summaries, leading groups, and practical review prompts. No API key is needed.</p>
  </div>;

  const total = values.reduce((sum, value) => sum + value, 0);
  const bounds = values.reduce((range, value) => ({ low: Math.min(range.low, value), high: Math.max(range.high, value) }), { low: Infinity, high: -Infinity });
  const groups = new Map();
  if (breakdown) sheet.rows.forEach((row) => {
    const value = parseNumericValue(row[metric]);
    if (value === null) return;
    const label = String(row[breakdown] ?? "Unknown");
    groups.set(label, (groups.get(label) ?? 0) + value);
  });
  const leader = Array.from(groups, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)[0];
  const share = leader && total > 0 && values.every((value) => value >= 0) ? leader.value / total * 100 : null;
  const format = (value) => formatMetricDisplay(value, metric);
  return <div className="takeaways">
    <div className="takeaways-header"><h3>Workbook takeaways</h3><span className="local-analysis-badge">Local analysis</span></div>
    <p className="takeaways-context">{sheet.name} / {metric}{breakdown ? ` by ${breakdown}` : ""}. Calculated from all cleaned rows, not just the chart sample. These are rule-based observations, not AI predictions.</p>
    <div className="takeaways-grid">
      <article className="takeaway-card"><h4>Measure summary</h4><strong>{format(total)}</strong>
        <p>{metric} total across {values.length.toLocaleString()} numeric records. Average per record: {format(total / values.length)}.</p>
        <p>Range: {format(bounds.low)} to {format(bounds.high)}.</p>
      </article>
      <article className="takeaway-card"><h4>Leading group</h4><strong>{leader?.label ?? "Choose a grouping"}</strong>
        <p>{leader ? `${leader.label} has the highest ${metric} total at ${format(leader.value)} across ${groups.size} groups.` : "Select a breakdown field in Visual Builder to compare grouped totals."}</p>
        {share !== null && <p>{share.toFixed(1)}% of the full measured total.</p>}
        {leader && share === null && <p>Percentage shares are not shown when values are negative or the total is zero.</p>}
      </article>
      <article className="takeaway-card"><h4>Review next</h4><strong>{share !== null && share >= 50 && groups.size > 1 ? "Check concentration" : "Validate the detail"}</strong>
        <p>{share !== null && share >= 50 && groups.size > 1
          ? `${leader.label} accounts for at least half of the total. Compare other groups before drawing conclusions about overall performance.`
          : "Review the smallest and largest records in the full sheet preview, then change the metric or grouping to test another question."}</p>
        <p>Cleaning fills missing values and removes duplicates. Reconcile important totals with your source workbook.</p>
      </article>
    </div>
  </div>;
}
