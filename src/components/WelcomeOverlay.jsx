export default function WelcomeOverlay({ visible, onDismiss }) {
  if (!visible) {
    return null;
  }

  return (
    <div className="welcome-overlay" role="dialog" aria-modal="true">
      <div className="welcome-card">
        <div className="welcome-graphic" aria-hidden="true">
          <div className="orb orb-one"></div>
          <div className="orb orb-two"></div>
          <div className="orb orb-three"></div>
          <div className="welcome-grid"></div>
          <img
            className="welcome-logo"
            src="/easy-made-insights-logo.png"
            alt="EasyMadeInsights logo"
          />
        </div>

        <p className="eyebrow">Welcome</p>
        <h1>EasyMadeInsights</h1>
        <p className="welcome-copy">
          Upload spreadsheets, review clean business dashboards, and explore
          insights without the usual Excel friction.
        </p>

        <div className="welcome-points">
          <span>Workbook parsing</span>
          <span>Interactive charts</span>
          <span>Professional summaries</span>
        </div>

        <button type="button" className="welcome-btn" onClick={onDismiss}>
          Enter Dashboard
        </button>
      </div>
    </div>
  );
}
