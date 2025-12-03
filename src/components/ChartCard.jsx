export default function ChartCard({ title, children }) {
  return (
    <div className="chart-card">
      <div className="chart-title">{title}</div>

      <div className="chart-body">
        {children || <span>Chart will appear here</span>}
      </div>
    </div>
  );
}
