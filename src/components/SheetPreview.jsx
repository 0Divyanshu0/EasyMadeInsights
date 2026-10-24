import { useState } from "react";
import Dialog from "./Dialog";

const PAGE_SIZE = 25;

export default function SheetPreview({ sheet, onClose }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const search = query.trim().toLowerCase();
  const rows = search ? sheet.rows.filter((row) => sheet.columns.some((column) => String(row[column] ?? "").toLowerCase().includes(search))) : sheet.rows;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  return <Dialog title={`${sheet.name} | Full sheet preview`} onClose={onClose} className="expanded-preview" backLabel="Back to dashboard">
    <div className="preview-toolbar">
      <label>Search rows <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} /></label>
      <span>{rows.length.toLocaleString()} matching rows | {sheet.columns.length} columns</span>
    </div>
    <div className="expanded-preview-stage" tabIndex={0} aria-label="Full sheet table">
      <table className="full-sheet-table">
        <thead><tr>{sheet.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map((row, index) => <tr key={current * PAGE_SIZE + index}>
          {sheet.columns.map((column) => <td key={column}>{String(row[column] ?? "")}</td>)}
        </tr>)}</tbody>
      </table>
      {!rows.length && <p>No rows match your search.</p>}
    </div>
    <div className="preview-toolbar">
      <button disabled={!current} onClick={() => setPage(current - 1)}>Previous page</button>
      <span role="status">Page {current + 1} of {pages} | Cleaned worksheet data</span>
      <button disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}>Next page</button>
    </div>
  </Dialog>;
}
