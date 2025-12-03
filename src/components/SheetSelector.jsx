export default function SheetSelector({ sheets, onSelect }) {
  return (
    <div className="sheet-selector">
      <label>Select Sheet:</label>
      <select onChange={(e) => onSelect(e.target.value)}>
        <option>Select...</option>
        {sheets.map((sheet, idx) => (
          <option key={idx} value={sheet}>
            {sheet}
          </option>
        ))}
      </select>
    </div>
  );
}
