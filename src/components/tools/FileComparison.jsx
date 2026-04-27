import { useEffect, useState } from "react";

export default function FileComparison() {
  const [mode, setMode] = useState("paste");
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [content1, setContent1] = useState("");
  const [content2, setContent2] = useState("");
  const [error, setError] = useState("");
  const [diff, setDiff] = useState([]);

  const normalizeText = (text) => text.replace(/\r/g, "");

  const handleFileSelect = async (e, fileNum) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = normalizeText(await file.text());
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

  const computeWordDiff = (oldText, newText) => {
    const oldWords = oldText.split(/\s+/).filter(w => w);
    const newWords = newText.split(/\s+/).filter(w => w);
    const result = [];
    let i = 0, j = 0;

    while (i < oldWords.length || j < newWords.length) {
      if (i < oldWords.length && j < newWords.length && oldWords[i] === newWords[j]) {
        result.push({ text: oldWords[i], type: 'same' });
        i++;
        j++;
      } else {
        // Check for removed word
        if (i < oldWords.length && (j >= newWords.length || oldWords[i] !== newWords[j])) {
          result.push({ text: oldWords[i], type: 'removed' });
          i++;
        }
        // Check for added word
        if (j < newWords.length && (i >= oldWords.length || newWords[j] !== oldWords[i])) {
          result.push({ text: newWords[j], type: 'added' });
          j++;
        }
      }
    }
    return result;
  };

  const computeDiff = (leftText, rightText) => {
    const leftLines = normalizeText(leftText).split("\n");
    const rightLines = normalizeText(rightText).split("\n");
    const maxLines = Math.max(leftLines.length, rightLines.length);
    const diffs = [];

    for (let i = 0; i < maxLines; i++) {
      const leftLine = leftLines[i] ?? "";
      const rightLine = rightLines[i] ?? "";
      let type = "same";
      let wordDiff = null;

      if (leftLine === rightLine) {
        type = "same";
      } else if (!leftLine && rightLine) {
        type = "added";
      } else if (leftLine && !rightLine) {
        type = "removed";
      } else {
        type = "modified";
        wordDiff = computeWordDiff(leftLine, rightLine);
      }

      diffs.push({
        line: i + 1,
        leftNumber: leftLine ? i + 1 : null,
        rightNumber: rightLine ? i + 1 : null,
        leftLine,
        rightLine,
        type,
        wordDiff,
      });
    }

    return diffs;
  };

  useEffect(() => {
    if (content1 || content2) {
      setDiff(computeDiff(content1, content2));
    }
  }, [content1, content2]);

  const handleCompare = () => {
    if (!content1 || !content2) {
      setError("Please provide both inputs to compare.");
      return;
    }

    setDiff(computeDiff(content1, content2));
    setError("");
  };

  return (
    <div className="tool-content file-comparison">
      <div className="comparison-mode-toggle">
        <button
          type="button"
          className={mode === "paste" ? "active" : ""}
          onClick={() => setMode("paste")}
        >
          Paste Text
        </button>
        <button
          type="button"
          className={mode === "upload" ? "active" : ""}
          onClick={() => setMode("upload")}
        >
          Upload Files
        </button>
      </div>

      <div className="comparison-header">
        {mode === "upload" ? (
          <div className="comparison-split">
            <div className="comparison-panel">
              <label htmlFor="file1-input">File 1</label>
              <input
                id="file1-input"
                type="file"
                accept=".txt,.csv,.json,.md,.log"
                onChange={(e) => handleFileSelect(e, 1)}
                className="file-input"
              />
              {file1 && <p className="file-name">{file1.name}</p>}
            </div>
            <div className="comparison-panel">
              <label htmlFor="file2-input">File 2</label>
              <input
                id="file2-input"
                type="file"
                accept=".txt,.csv,.json,.md,.log"
                onChange={(e) => handleFileSelect(e, 2)}
                className="file-input"
              />
              {file2 && <p className="file-name">{file2.name}</p>}
            </div>
          </div>
        ) : (
          <div className="comparison-split">
            <div className="comparison-panel">
              <div className="comparison-panel-header">Text 1</div>
              <textarea
                value={content1}
                onChange={(e) => setContent1(e.target.value)}
                placeholder="Paste or type text here..."
              />
            </div>
            <div className="comparison-panel">
              <div className="comparison-panel-header">Text 2</div>
              <textarea
                value={content2}
                onChange={(e) => setContent2(e.target.value)}
                placeholder="Paste or type text here..."
              />
            </div>
          </div>
        )}

        <button
          className="compare-btn"
          onClick={handleCompare}
          disabled={!content1 || !content2}
        >
          Compare Now
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="diff-legend">
        <span className="legend-item legend-same">No Change</span>
        <span className="legend-item legend-modified">Modified</span>
        <span className="legend-item legend-added">Added</span>
        <span className="legend-item legend-removed">Removed</span>
      </div>

      <div className="diff-view">
        <div className="diff-panel">
          <div className="diff-panel-header">Comparison</div>
          <div className="diff-panel-body">
            {diff.length === 0 ? (
              <p className="info-message">Paste or upload both inputs to see the diff.</p>
            ) : (
              diff.map((item) => (
                <div
                  key={`row-${item.line}`}
                  className={`diff-row ${item.type}`}
                >
                  <div className="gutter left-gutter">
                    {item.type === "added" && <span className="symbol added">+</span>}
                    {item.type === "removed" && <span className="symbol removed">-</span>}
                    <span className="line-number">{item.leftNumber ?? ""}</span>
                  </div>
                  <span className="diff-text left-text">
                    {item.type === "modified" && item.wordDiff ? (
                      item.wordDiff.map((word, idx) => (
                        <span key={idx} className={`word ${word.type}`}>
                          {word.text}{idx < item.wordDiff.length - 1 ? " " : ""}
                        </span>
                      ))
                    ) : (
                      item.leftLine
                    )}
                  </span>
                  <div className="gutter right-gutter">
                    {item.type === "added" && <span className="symbol added">+</span>}
                    {item.type === "removed" && <span className="symbol removed">-</span>}
                    <span className="line-number">{item.rightNumber ?? ""}</span>
                  </div>
                  <span className="diff-text right-text">
                    {item.type === "modified" && item.wordDiff ? (
                      item.wordDiff.map((word, idx) => (
                        <span key={idx} className={`word ${word.type}`}>
                          {word.text}{idx < item.wordDiff.length - 1 ? " " : ""}
                        </span>
                      ))
                    ) : (
                      item.rightLine
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
