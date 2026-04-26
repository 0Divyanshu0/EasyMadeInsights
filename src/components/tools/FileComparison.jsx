import { useState } from "react";

export default function FileComparison() {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [content1, setContent1] = useState("");
  const [content2, setContent2] = useState("");
  const [error, setError] = useState("");
  const [diff, setDiff] = useState(null);

  const handleFileSelect = async (e, fileNum) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      if (fileNum === 1) {
        setFile1(file);
        setContent1(text);
      } else {
        setFile2(file);
        setContent2(text);
      }
      setError("");
    } catch (err) {
      setError("Failed to read file: " + err.message);
    }
  };

  const computeDiff = () => {
    if (!content1 || !content2) {
      setError("Please select both files");
      return;
    }

    const lines1 = content1.split("\n");
    const lines2 = content2.split("\n");
    const diffs = [];

    const maxLines = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || "";
      const line2 = lines2[i] || "";

      if (line1 === line2) {
        diffs.push({ type: "same", line1, line2 });
      } else {
        diffs.push({ type: "different", line1, line2 });
      }
    }

    setDiff(diffs);
    setError("");
  };

  return (
    <div className="tool-content file-comparison">
      <div className="comparison-header">
        <div className="file-upload">
          <label htmlFor="file1-input">File 1:</label>
          <input
            id="file1-input"
            type="file"
            onChange={(e) => handleFileSelect(e, 1)}
            className="file-input"
          />
          {file1 && <p className="file-name">{file1.name}</p>}
        </div>

        <div className="file-upload">
          <label htmlFor="file2-input">File 2:</label>
          <input
            id="file2-input"
            type="file"
            onChange={(e) => handleFileSelect(e, 2)}
            className="file-input"
          />
          {file2 && <p className="file-name">{file2.name}</p>}
        </div>

        <button className="compare-btn" onClick={computeDiff} disabled={!file1 || !file2}>
          Compare Files
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {diff && (
        <div className="diff-view">
          <table className="diff-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{file1?.name}</th>
                <th>{file2?.name}</th>
              </tr>
            </thead>
            <tbody>
              {diff.map((item, idx) => (
                <tr key={idx} className={`diff-row diff-${item.type}`}>
                  <td className="line-number">{idx + 1}</td>
                  <td className="diff-content diff-left">{item.line1}</td>
                  <td className="diff-content diff-right">{item.line2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}