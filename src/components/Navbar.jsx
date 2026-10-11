export default function Navbar({ theme, onToggleTheme, isConversions, onSwitchWorkspace }) {
  return (
    <header className="navbar">
      <div>
        <h2 className="nav-title">{isConversions ? "File tools" : "Workbook dashboard"}</h2>
        <div className="nav-subtitle">{isConversions ? "A focused space to convert and edit files" : "Explore your data with confidence"}</div>
      </div>

      <div className="nav-actions">
        <button type="button" className="workspace-switch mobile-workspace-switch" onClick={onSwitchWorkspace}>
          {isConversions ? "Back to EasyMadeInsights" : "Open EasyMadeConversions"}
        </button>
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          <span className="theme-toggle-icon">
            {theme === "light" ? "Dark" : "Light"}
          </span>
          <span className="theme-toggle-text">
            {theme === "light" ? "Mode" : "Mode"}
          </span>
        </button>
      </div>
    </header>
  );
}
