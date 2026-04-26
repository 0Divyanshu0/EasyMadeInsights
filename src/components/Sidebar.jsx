import { useNavigate, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { id: "upload", label: "Upload" },
  { id: "overview", label: "Overview" },
  { id: "visual-builder", label: "Visual Builder" },
  { id: "preview", label: "Preview" },
  { id: "insights", label: "Insights" },
  { id: "conversions", label: "EasyMadeConversion", isPage: true },
];

export default function Sidebar({ activeSection, onNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveClass = (item) => {
    if (item.isPage) {
      return location.pathname === `/${item.id}` ? "active" : "";
    }
    return activeSection === item.id ? "active" : "";
  };
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
                  className={getActiveClass(item)}
                  onClick={() => item.isPage ? navigate(`/${item.id}`) : onNavigate(item.id)}
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
