import { useEffect, useRef } from "react";
import { renderAsync } from "docx-preview";

export default function DocxPreview({ docxBlob, fitToWidth = true }) {
  const containerRef = useRef(null);
  const fitRef = useRef(fitToWidth);
  const measureRef = useRef(null);

  useEffect(() => {
    fitRef.current = fitToWidth;
    measureRef.current?.();
  }, [fitToWidth]);

  useEffect(() => {
    let cancelled = false;
    let observer;
    let frame;
    const host = containerRef.current;
    if (!host || !docxBlob) return;
    const loading = document.createElement("p");
    loading.className = "info-message";
    loading.setAttribute("role", "status");
    loading.textContent = "Preparing document preview...";
    host.setAttribute("aria-busy", "true");
    host.replaceChildren(loading);
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (cancelled) return;
        const pages = host.querySelectorAll(".docx-page-frame");
        if (!pages.length) return;
        const styles = getComputedStyle(host);
        const available = Math.max(1, host.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight));
        pages.forEach((pageFrame) => {
          const page = pageFrame.querySelector("section.docx");
          const width = Math.max(page.offsetWidth, page.scrollWidth);
          const height = Math.max(page.offsetHeight, page.scrollHeight);
          const scale = fitRef.current && width ? Math.min(1, available / width) : 1;
          pageFrame.style.width = width * scale + "px";
          pageFrame.style.height = height * scale + "px";
          const inner = pageFrame.firstElementChild;
          inner.style.width = width + "px";
          inner.style.transform = `scale(${scale})`;
        });
        host.setAttribute("aria-busy", "false");
      });
    };
    measureRef.current = measure;
    const render = async () => {
      try {
        const staging = document.createElement("div");
        await renderAsync(docxBlob, staging, undefined, {
          breakPages: true, inWrapper: true, ignoreWidth: false, ignoreHeight: false,
          ignoreFonts: false, useBase64URL: true, className: "docx",
        });
        if (cancelled) return;
        host.replaceChildren(...staging.childNodes);
        const pages = host.querySelectorAll("section.docx");
        if (!pages.length) throw new Error("The document renderer returned no pages.");
        pages.forEach((page) => {
          const pageFrame = document.createElement("div");
          pageFrame.className = "docx-page-frame";
          const inner = document.createElement("div");
          inner.className = "docx-page-scale";
          page.replaceWith(pageFrame);
          page.style.margin = "0";
          inner.appendChild(page);
          pageFrame.appendChild(inner);
        });
        observer = new ResizeObserver(measure);
        observer.observe(host);
        host.querySelectorAll("section.docx").forEach((page) => observer.observe(page));
        measure();
      } catch {
        if (!cancelled) {
          const notice = document.createElement("p");
          notice.className = "info-message";
          notice.setAttribute("role", "alert");
          notice.textContent = "Unable to render this DOCX preview. Download the file to inspect it in Word.";
          host.replaceChildren(notice);
          host.setAttribute("aria-busy", "false");
        }
      }
    };
    host.addEventListener("load", measure, true);
    render();
    return () => {
      cancelled = true;
      observer?.disconnect();
      cancelAnimationFrame(frame);
      host.removeEventListener("load", measure, true);
      measureRef.current = null;
      host.replaceChildren();
      host.removeAttribute("aria-busy");
    };
  }, [docxBlob]);

  return <div className="docx-preview-host" ref={containerRef} />;
}
