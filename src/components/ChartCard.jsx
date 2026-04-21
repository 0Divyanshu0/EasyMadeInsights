export default function ChartCard({ title, subtitle, children }) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title">{title}</div>
        {subtitle ? <div className="chart-subtitle">{subtitle}</div> : null}
      </div>
      <div className="chart-body">{children || <span>Chart will appear here</span>}</div>
    </div>
  );
}
