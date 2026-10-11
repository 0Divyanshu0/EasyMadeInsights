const NAV_ITEMS = [
  { id: "upload", label: "Upload" },
  { id: "overview", label: "Overview" },
  { id: "visual-builder", label: "Visual Builder" },
  { id: "preview", label: "Preview" },
  { id: "insights", label: "Insights" },
];

export default function Sidebar({ activeSection, onNavigate, isConversions, isDashboard, onSwitchWorkspace }) {
  return <aside className="sidebar">
    <div>
      <div className="brand">
        <p className="brand-name">{isConversions ? "EasyMadeConversions" : "EasyMadeInsights"}</p>
        <small>{isConversions ? "File tools workspace" : "Workbook analytics"}</small>
      </div>
      <nav aria-label="Workspace navigation">
        <ul>
          {isDashboard && NAV_ITEMS.map((item) => <li key={item.id}>
            <button type="button" className={activeSection === item.id ? "active" : ""}
              aria-current={activeSection === item.id ? "location" : undefined} onClick={() => onNavigate(item.id)}>{item.label}</button>
          </li>)}
          <li className="workspace-nav">
            <button type="button" onClick={onSwitchWorkspace}>{isDashboard ? "Open EasyMadeConversions" : "Back to EasyMadeInsights"}</button>
          </li>
        </ul>
      </nav>
    </div>
    <div className="sidebar-footer"><small>{isConversions ? "Convert. Edit. Export." : "Your data. Your reporting."}</small></div>
  </aside>;
}
