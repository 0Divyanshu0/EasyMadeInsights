import { useEffect, useRef } from "react";
import { renderAsync } from "docx-preview";

export default function DocxPreview({ docxBlob }) {
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const host = containerRef.current;

    const render = async () => {
      if (!docxBlob || !host) return;
      host.innerHTML = "";

      try {
        await renderAsync(docxBlob, host, undefined, {
          breakPages: true,
          inWrapper: true,
          ignoreWidth: true,
          ignoreHeight: false,
          ignoreFonts: false,
          useBase64URL: true,
          experimental: true,
          className: "docx-preview-root",
        });
      } catch {
        if (!cancelled && host) {
          host.innerHTML =
            '<p class="info-message">Unable to render rich DOCX preview for this file.</p>';
        }
      }
    };

    render();

    return () => {
      cancelled = true;
      if (host) {
        host.innerHTML = "";
      }
    };
  }, [docxBlob]);

  return <div className="docx-preview-host" ref={containerRef} />;
}
