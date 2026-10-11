import { useRef, useState } from "react";

const normalizeText = (text) => text.replace(/\r\n?/g, "\n");

const buildWordDiff = (leftText, rightText) => {
  const leftWords = leftText.match(/\s+|\S+/g) || [];
  const rightWords = rightText.match(/\s+|\S+/g) || [];
  const m = leftWords.length;
  const n = rightWords.length;

  if (m * n > 100000) {
    return { leftTokens: [{ text: leftText, type: "removed" }], rightTokens: [{ text: rightText, type: "added" }] };
  }

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
  const leftLines = leftText ? normalizeText(leftText).split("\n") : [];
  const rightLines = rightText ? normalizeText(rightText).split("\n") : [];
  const m = leftLines.length;
  const n = rightLines.length;
  if (leftText.length + rightText.length > 400000 || m * n > 2000000) {
    throw new Error("These inputs are too large for an inline comparison. Compare smaller sections (up to 200,000 characters per input).");
  }
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
    if (current.type === "same") { diffs.push(current); continue; }
    const removed = [];
    const added = [];
    while (k < raw.length && raw[k].type !== "same") {
      (raw[k].type === "removed" ? removed : added).push(raw[k]);
      k++;
    }
    k--;
    for (let offset = 0; offset < Math.max(removed.length, added.length); offset++) {
      const left = removed[offset];
      const right = added[offset];
      if (left && right) {
        diffs.push({ type: "modified", leftLine: left.leftLine, rightLine: right.rightLine,
          leftNumber: left.leftNumber, rightNumber: right.rightNumber,
          ...buildWordDiff(left.leftLine, right.rightLine) });
      } else { diffs.push(left || right); }
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
  const [diff, setDiff] = useState(null);
  const selectionRef = useRef({ 1: 0, 2: 0 });

  const updateInput = (text, side) => {
    (side === 1 ? setContent1 : setContent2)(text);
    setDiff(null);
    setError("");
  };

  const changeMode = (next) => {
    if (next === mode) return;
    selectionRef.current[1] += 1;
    selectionRef.current[2] += 1;
    setMode(next);
    setFile1(null);
    setFile2(null);
    updateInput("", 1);
    updateInput("", 2);
  };

  const handleFileSelect = async (e, fileNum) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const selection = ++selectionRef.current[fileNum];
    (fileNum === 1 ? setFile1 : setFile2)(null);
    updateInput("", fileNum);

    try {
      if (!/\.(txt|csv|json|md|log)$/i.test(file.name) || file.size > 200000) {
        throw new Error("Select a text file up to 200 KB (.txt, .csv, .json, .md, or .log).");
      }
      console.log(`📁 FileComparison: Reading file ${fileNum}: ${file.name}`);
      const text = normalizeText(await file.text());
      if (selection !== selectionRef.current[fileNum]) return;
      if (text.includes("\u0000")) throw new Error("Select a UTF-8 text file. Binary files are not supported.");
      console.log(`✅ FileComparison: File ${fileNum} loaded, ${text.length} chars`);
      
      if (fileNum === 1) {
        setFile1(file);
        updateInput(text, 1);
      } else {
        setFile2(file);
        updateInput(text, 2);
      }
      setError("");
    } catch (err) {
      if (selection !== selectionRef.current[fileNum]) return;
      (fileNum === 1 ? setFile1 : setFile2)(null);
      updateInput("", fileNum);
      console.error(`❌ FileComparison: Error reading file ${fileNum}:`, err);
      setError("Failed to read file: " + err.message);
    }
  };

  const handleCompare = () => {
    setError("");
    try { setDiff(computeDiff(content1, content2)); }
    catch (err) { setDiff(null); setError(err.message); }
  };

  return (
    <div className="tool-content file-comparison">
      <div className="comparison-mode-toggle">
        <button
          type="button"
          className={mode === "paste" ? "active" : ""}
          onClick={() => changeMode("paste")}
        >
          Paste Text
        </button>
        <button
          type="button"
          className={mode === "upload" ? "active" : ""}
          onClick={() => changeMode("upload")}
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
              <label htmlFor="comparison-left" className="comparison-panel-header">Text 1</label>
              <textarea
                id="comparison-left"
                maxLength={200000}
                value={content1}
                onChange={(e) => updateInput(e.target.value, 1)}
                placeholder="Paste or type text here..."
              />
            </div>
            <div className="comparison-panel">
              <label htmlFor="comparison-right" className="comparison-panel-header">Text 2</label>
              <textarea
                id="comparison-right"
                maxLength={200000}
                value={content2}
                onChange={(e) => updateInput(e.target.value, 2)}
                placeholder="Paste or type text here..."
              />
            </div>
          </div>
        )}

        <button
          className="compare-btn"
          onClick={handleCompare}
          disabled={mode === "upload" ? !file1 || !file2 : !content1 && !content2}
        >
          Compare Now
        </button>
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}
      {diff && <p className="info-message" role="status">{diff.every((item) => item.type === "same") ? "The inputs are identical." : `${diff.filter((item) => item.type !== "same").length} changed lines.`}</p>}

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
            {!diff ? (
              <p className="info-message">Paste or upload your inputs, then click Compare Now.</p>
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
