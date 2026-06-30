import { useMemo, useState } from "react";

const normalizeText = (text) => text.replace(/\r/g, "");

const buildWordDiff = (leftText, rightText) => {
  const leftWords = leftText.split(/\s+/).filter(Boolean);
  const rightWords = rightText.split(/\s+/).filter(Boolean);
  const m = leftWords.length;
  const n = rightWords.length;

  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (leftWords[i] === rightWords[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1];
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const leftTokens = [];
  const rightTokens = [];
  let i = 0;
  let j = 0;

  while (i < m && j < n) {
    if (leftWords[i] === rightWords[j]) {
      leftTokens.push({ text: leftWords[i], type: "same" });
      rightTokens.push({ text: rightWords[j], type: "same" });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      leftTokens.push({ text: leftWords[i], type: "removed" });
      i++;
    } else {
      rightTokens.push({ text: rightWords[j], type: "added" });
      j++;
    }
  }

  while (i < m) {
    leftTokens.push({ text: leftWords[i], type: "removed" });
    i++;
  }

  while (j < n) {
    rightTokens.push({ text: rightWords[j], type: "added" });
    j++;
  }

  return { leftTokens, rightTokens };
};

const computeDiff = (leftText, rightText) => {
  const leftLines = normalizeText(leftText).split("\n");
  const rightLines = normalizeText(rightText).split("\n");
  const m = leftLines.length;
  const n = rightLines.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (leftLines[i] === rightLines[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1];
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const raw = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (leftLines[i] === rightLines[j]) {
      raw.push({
        type: "same",
        leftLine: leftLines[i],
        rightLine: rightLines[j],
        leftNumber: i + 1,
        rightNumber: j + 1,
      });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      raw.push({
        type: "removed",
        leftLine: leftLines[i],
        rightLine: "",
        leftNumber: i + 1,
        rightNumber: null,
      });
      i++;
    } else {
      raw.push({
        type: "added",
        leftLine: "",
        rightLine: rightLines[j],
        leftNumber: null,
        rightNumber: j + 1,
      });
      j++;
    }
  }

  while (i < m) {
    raw.push({
      type: "removed",
      leftLine: leftLines[i],
      rightLine: "",
      leftNumber: i + 1,
      rightNumber: null,
    });
    i++;
  }

  while (j < n) {
    raw.push({
      type: "added",
      leftLine: "",
      rightLine: rightLines[j],
      leftNumber: null,
      rightNumber: j + 1,
    });
    j++;
  }

  const diffs = [];
  for (let k = 0; k < raw.length; k++) {
    const current = raw[k];
    if (
      current.type === "removed" &&
      raw[k + 1] &&
      raw[k + 1].type === "added"
    ) {
      const next = raw[k + 1];
      const diffTokens = buildWordDiff(current.leftLine, next.rightLine);
      diffs.push({
        type: "modified",
        leftLine: current.leftLine,
        rightLine: next.rightLine,
        leftNumber: current.leftNumber,
        rightNumber: next.rightNumber,
        leftTokens: diffTokens.leftTokens,
        rightTokens: diffTokens.rightTokens,
      });
      k++;
    } else {
      diffs.push({
        ...current,
        leftTokens: null,
        rightTokens: null,
      });
    }
  }

  return diffs.map((item, index) => ({
    line: index + 1,
    ...item,
  }));
};

export default function FileComparison() {
  const [mode, setMode] = useState("paste");
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [content1, setContent1] = useState("");
  const [content2, setContent2] = useState("");
  const [error, setError] = useState("");

  const handleFileSelect = async (e, fileNum) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      console.log(`📁 FileComparison: Reading file ${fileNum}: ${file.name}`);
      const text = normalizeText(await file.text());
      console.log(`✅ FileComparison: File ${fileNum} loaded, ${text.length} chars`);
      
      if (fileNum === 1) {
        setFile1(file);
        setContent1(text);
      } else {
        setFile2(file);
        setContent2(text);
      }
      setError("");
    } catch (err) {
      console.error(`❌ FileComparison: Error reading file ${fileNum}:`, err);
      setError("Failed to read file: " + err.message);
    }
  };

  const diff = useMemo(() => {
    if (!content1 && !content2) {
      return [];
    }

    return computeDiff(content1, content2);
  }, [content1, content2]);

  const handleCompare = () => {
    if (!content1 || !content2) {
      setError("Please provide both inputs to compare.");
      return;
    }

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
                    {item.type === "modified" && item.leftTokens ? (
                      item.leftTokens.map((word, idx) => (
                        <span key={idx} className={`word ${word.type}`}>
                          {word.text}
                          {idx < item.leftTokens.length - 1 ? " " : ""}
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
                    {item.type === "modified" && item.rightTokens ? (
                      item.rightTokens.map((word, idx) => (
                        <span key={idx} className={`word ${word.type}`}>
                          {word.text}
                          {idx < item.rightTokens.length - 1 ? " " : ""}
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
