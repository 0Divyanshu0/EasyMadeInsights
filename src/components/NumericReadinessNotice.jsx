export default function NumericReadinessNotice({ assessment, sheetName, onDismiss }) {
  if (!assessment?.warning) return null;
  return <aside className="numeric-readiness-notice" role="status" aria-live="polite" aria-atomic="true">
    <span className="numeric-readiness-icon" aria-hidden="true">i</span>
    <div className="numeric-readiness-copy">
      <h3>Limited numeric insights</h3>
      <p><strong>{sheetName}</strong>: {assessment.warning.message}</p>
      <p className="numeric-readiness-hint">Your file is still imported and all existing tools remain available. For richer numeric analysis, include measures such as amounts, quantities, durations, or scores.</p>
    </div>
    <button type="button" className="numeric-readiness-dismiss" aria-label="Dismiss numeric insight warning" onClick={onDismiss}>Dismiss</button>
  </aside>;
}
