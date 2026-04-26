export default function WelcomeOverlay({ visible, onDismiss, logo = "/easy-made-insights-logo.png", title = "EasyMadeInsights", description = "Upload spreadsheets, review clean business dashboards, and explore insights without the usual Excel friction.", features = ["Workbook parsing", "Interactive charts", "Professional summaries"], buttonText = "Enter Dashboard" }) {
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
            src={logo}
            alt={`${title} logo`}
          />
        </div>

        <p className="eyebrow">Welcome</p>
        <h1>{title}</h1>
        <p className="welcome-copy">
          {description}
        </p>

        <div className="welcome-points">
          {features.map((feature, index) => (
            <span key={index}>{feature}</span>
          ))}
        </div>

        <button type="button" className="welcome-btn" onClick={onDismiss}>
          {buttonText}
        </button>
      </div>
    </div>
  );
}
