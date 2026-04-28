export default function AIInsightsPanel({ onNotify, disabled }) {
  return (
    <section className="ai-panel">
      <div className="ai-panel-header">
        <div>
          <p className="eyebrow">Upcoming feature</p>
          <h3>AI Summary</h3>
          <p className="ai-panel-copy">
            We are shaping this into a polished analyst-style summary experience
            with executive highlights, risks, and next-step recommendations.
          </p>
        </div>

        <div className="ai-actions">
          <button
            type="button"
            className="ai-btn primary"
            onClick={onNotify}
            disabled={disabled}
          >
            See Upcoming Status
          </button>
        </div>
      </div>

      <div className="ai-output-grid">
        <article className="ai-card ai-card-wide">
          <span className="ai-card-label">What's Planned</span>
          <p>
            AI summary is being prepared as a premium polish layer on top of the
            workbook analytics already visible in the dashboard.
          </p>
        </article>

        <article className="ai-card">
          <span className="ai-card-label">Executive Summary</span>
          <p>
            Short business-ready narrative that explains the most important
            pattern in the active sheet.
          </p>
        </article>

        <article className="ai-card">
          <span className="ai-card-label">Risks & Opportunities</span>
          <p>
            Automatically highlighted growth areas, weak segments, and notable
            performance shifts.
          </p>
        </article>

        <article className="ai-card">
          <span className="ai-card-label">Recommended Actions</span>
          <p>
            Suggested next steps to make the spreadsheet output feel more useful
            than a normal chart dashboard.
          </p>
        </article>
      </div>
    </section>
  );
}
