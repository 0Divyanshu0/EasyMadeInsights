export default function Navbar({ theme, onToggleTheme }) {
  return (
    <header className="navbar">
      <div>
        <h2 className="nav-title">Dashboard</h2>
        <div className="nav-subtitle">Ready to analyze your workbook</div>
      </div>

      <div className="nav-actions">
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
