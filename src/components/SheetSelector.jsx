export default function SheetSelector({ sheets, value, onSelect }) {
  return (
    <div className="sheet-selector">
      <label htmlFor="sheet-select">Select Sheet:</label>
      <select
        id="sheet-select"
        value={value}
        onChange={(e) => onSelect(e.target.value)}
      >
        {sheets.map((sheet, idx) => (
          <option key={idx} value={sheet}>
            {sheet}
          </option>
        ))}
      </select>
    </div>
  );
}
