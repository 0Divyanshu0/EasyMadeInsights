import { useEffect, useRef, useState } from "react";
import PreviewModal from "../PreviewModal";
import DocxPreview from "./DocxPreview";
import FilePicker from "./FilePicker";
import { downloadBlob, requestConversion } from "../../utils/conversion.js";

export default function DocumentConverter({ mode }) {
  const toWord = mode === "pdf-to-word";
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [ocrMode, setOcrMode] = useState("auto");
  const [expanded, setExpanded] = useState(null);
  const requestRef = useRef(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    const preview = toWord ? file : result;
    if (!preview) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(preview);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, result, toWord]);
  const selectFile = (event) => {
    const next = event.target.files?.[0];
    event.target.value = "";
    if (!next) return;
    requestRef.current?.abort();
    requestRef.current = null;
    setExpanded(null);
    setBusy(false);
    setResult(null);
    setFile(null);
    setError("");
    const valid = toWord ? /\.pdf$/i.test(next.name) : /\.docx?$/i.test(next.name);
    if (!valid) { setError(`Please select ${toWord ? "a PDF" : "a DOC or DOCX"} file.`); return; }
    if (!next.size || next.size > 50 * 1024 * 1024) {
      setError("Select a non-empty document no larger than 50 MB."); return;
    }
    setFile(next);
  };
  const convert = async () => {
    if (!file || busy) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setExpanded(null);
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const blob = await requestConversion(mode, file, controller.signal, undefined, { ocrMode });
      if (requestRef.current === controller && !controller.signal.aborted) setResult(blob);
    } catch (err) {
      if (requestRef.current === controller && !controller.signal.aborted) setError(err.message);
    } finally {
      if (requestRef.current === controller) { setBusy(false); requestRef.current = null; }
    }
  };
  return (
    <div className={`tool-content ${toWord ? "pdf-to-word" : "word-to-pdf"}`} aria-busy={busy}>
      <ol className="tool-steps" aria-label="Conversion steps">
        {["Select a document", "Convert", "Review & download"].map((step, index) => <li key={step}
          aria-current={index === (result ? 2 : file ? 1 : 0) ? "step" : undefined}><span>{index + 1}</span>{step}</li>)}
      </ol>
      <div className="upload-section">
        <FilePicker id="document-input" label={`Select ${toWord ? "PDF" : "Word"} file`} accept={toWord ? ".pdf" : ".doc,.docx"} onChange={selectFile} />
        <p className="tool-input-hint">{toWord ? "PDF" : "DOC or DOCX"} / Up to 50 MB. Conversion uploads this document to the server.</p>
        {file && <p className="file-name">Selected: {file.name}</p>}
      </div>
      {error && <div className="error-message" role="alert">{error}</div>}
      {toWord && <div className="builder-control">
        <label htmlFor="pdf-text-recovery">Text recovery</label>
        <select id="pdf-text-recovery" value={ocrMode} onChange={(event) => {
          requestRef.current?.abort();
          requestRef.current = null;
          setExpanded(null); setBusy(false); setResult(null); setError(""); setOcrMode(event.target.value);
        }}>
          <option value="auto">Auto: native text first, OCR for scans</option>
          <option value="force">OCR every page: recover text missing from the PDF layer</option>
        </select>
        <p>Auto preserves native tables and text styles. Use OCR every page if embedded text is missing; it is slower and simplifies formatting.</p>
      </div>}
      {busy && <p className="info-message" role="status">{toWord ? "Extracting editable text and tables. Scanned pages use OCR and can take longer..." : "Converting your document..."}</p>}
      {result && <p className="info-message" role="status">Conversion complete. Review the result before downloading.</p>}
      {file && (
        <div className="preview-split">
          <div className="preview-panel">
            <h4>Original {toWord ? "PDF" : "Word document"}</h4>
            {(toWord || /\.docx$/i.test(file.name)) && <button className="preview-expand" onClick={() => setExpanded({ title: "Original document preview", type: toWord ? "pdf" : "docx", blob: file })}>Expand original preview</button>}
            {toWord ? (
              <iframe title="Original PDF" src={previewUrl} className="preview-iframe" />
            ) : /\.docx$/i.test(file.name) ? (
              <DocxPreview key={file.name + file.lastModified} docxBlob={file} />
            ) : <p>Preview is available for DOCX documents. Your DOC file can still be converted.</p>}
          </div>
          <div className="preview-panel">
            <h4>Converted {toWord ? "Word document" : "PDF"}</h4>
            {result && <button className="preview-expand" onClick={() => setExpanded({ title: "Converted document preview", type: toWord ? "docx" : "pdf", blob: result })}>Expand converted preview</button>}
            {result ? toWord ? (
              <DocxPreview key={result.size} docxBlob={result} />
            ) : <iframe title="Converted PDF" src={previewUrl} className="preview-iframe" /> : (
              <p>The converted document will appear here.</p>
            )}
          </div>
        </div>
      )}
      <div className="tool-actions">
        <button className="convert-btn" disabled={!file || busy} onClick={convert}>{busy ? "Converting..." : `Convert to ${toWord ? "Word" : "PDF"}`}</button>
        {result && <button className="convert-btn" onClick={() => downloadBlob(result, file.name.replace(/\.(pdf|docx?)$/i, toWord ? ".docx" : ".pdf"))}>Download {toWord ? "Word" : "PDF"} file</button>}
      </div>
      {expanded && <PreviewModal {...expanded} onClose={() => setExpanded(null)} backLabel="Back to converter"
        onDownload={expanded.blob === result ? () => downloadBlob(result, file.name.replace(/\.(pdf|docx?)$/i, toWord ? ".docx" : ".pdf")) : undefined} />}
      <div className="info-box">Documents up to 50 MB are sent to the conversion service. {toWord ? "Text and tables become editable Word content, not page screenshots. English scans use OCR when its language model is installed. Review recognized text: scan quality, columns, and layout can affect accuracy. Photos remain images. Maximum 100 pages." : "Complex layouts may change; Word or LibreOffice provides the best layout fidelity."}</div>
    </div>
  );
}
