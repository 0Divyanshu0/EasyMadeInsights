const NAV_ITEMS = [
  { id: "upload", label: "Upload" },
  { id: "overview", label: "Overview" },
  { id: "visual-builder", label: "Visual Builder" },
  { id: "preview", label: "Preview" },
  { id: "insights", label: "Insights" },
];

export default function Sidebar({ activeSection, onNavigate }) {
  return (
    <aside className="sidebar">
      <div>
        <div className="brand">
          <h1>EasyMadeInsights</h1>
          <small>Beta</small>
        </div>

        <nav>
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={activeSection === item.id ? "active" : ""}
                  onClick={() => onNavigate(item.id)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="sidebar-footer">
        <small>v0.1 | Custom reporting mode</small>
      </div>
    </aside>
  );
}
