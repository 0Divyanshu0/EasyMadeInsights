export default function KPI({ title, value, detail }) {
  return (
    <div className="kpi-card">
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{value}</div>
      {detail ? <div className="kpi-detail">{detail}</div> : null}
    </div>
  );
}
