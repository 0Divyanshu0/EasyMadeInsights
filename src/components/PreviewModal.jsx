import { useEffect, useRef, useState } from "react";
import Dialog from "./Dialog";
import DocxPreview from "./tools/DocxPreview";

export default function PreviewModal({ title, type, blob, url, width, height, onClose, onDownload }) {
  const [fit, setFit] = useState(true);
  const pdfRef = useRef(null);
  useEffect(() => {
    if (type !== "pdf" || (!url && !blob)) return;
    const objectUrl = url || URL.createObjectURL(blob);
    pdfRef.current.src = `${objectUrl}#view=FitH`;
    return () => { if (!url) URL.revokeObjectURL(objectUrl); };
  }, [blob, url, type]);
  return <Dialog title={title} onClose={onClose} className="expanded-preview">
    <div className="preview-toolbar">
      {type !== "pdf" && <div role="group" aria-label="Expanded preview zoom">
        <button aria-pressed={fit} onClick={() => setFit(true)}>Fit to window</button>
        <button aria-pressed={!fit} onClick={() => setFit(false)}>100% size</button>
      </div>}
      <span>{type === "image" ? `${width} x ${height} px | Encoded export preview` : "Document preview | Scroll to see every page"}</span>
      {onDownload && <button onClick={onDownload}>Download file</button>}
    </div>
    <div className={`expanded-preview-stage ${type === "image" ? "image-checkerboard" : "document-preview-stage"}`} tabIndex={0} aria-label="Preview content">
      {type === "image" && <div className={`expanded-image ${fit ? "fit" : "actual"}`}>
        <img src={url} alt="Expanded export preview" style={fit ? undefined : { width, height }} />
      </div>}
      {type === "pdf" && <iframe title={title} ref={pdfRef} className="expanded-pdf" />}
      {type === "docx" && <DocxPreview docxBlob={blob} fitToWidth={fit} />}
    </div>
    <p className="preview-footnote">{type === "image" ? "The checkerboard indicates transparency and is not included in your download. ICO previews show the embedded PNG image." : "Browser document rendering is approximate. Use the downloaded document for its final layout."}</p>
  </Dialog>;
}
