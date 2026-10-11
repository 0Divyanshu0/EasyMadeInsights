import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

const dialogs = [];
let restoreBackground;

function updateLayers() {
  dialogs.forEach((dialog, index) => {
    const inactive = index !== dialogs.length - 1;
    dialog.overlay.inert = inactive;
    if (inactive) dialog.overlay.setAttribute("aria-hidden", "true");
    else dialog.overlay.removeAttribute("aria-hidden");
    dialog.overlay.style.zIndex = 1000 + index;
  });
}

export default function Dialog({ title, children, onClose, className = "", closeLabel = "Close preview", role = "dialog" }) {
  const titleId = useId();
  const overlayRef = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const overlay = overlayRef.current;
    const previousFocus = document.activeElement;
    const dialog = { overlay };
    if (!dialogs.length) {
      const root = document.getElementById("root");
      const inert = root?.inert;
      const hidden = root?.getAttribute("aria-hidden");
      const overflow = document.body.style.overflow;
      if (root) { root.inert = true; root.setAttribute("aria-hidden", "true"); }
      document.body.style.overflow = "hidden";
      restoreBackground = () => {
        document.body.style.overflow = overflow;
        if (root) {
          root.inert = inert;
          if (hidden === null) root.removeAttribute("aria-hidden");
          else root.setAttribute("aria-hidden", hidden);
        }
      };
    }
    dialogs.push(dialog);
    updateLayers();
    overlay.querySelector("button")?.focus();
    const keydown = (event) => {
      if (dialogs.at(-1) !== dialog) return;
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== "Tab") return;
      const items = Array.from(overlay.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], iframe, [tabindex="0"]'))
        .filter((element) => element.getClientRects().length && !element.closest("[hidden], [inert]"));
      const first = items[0];
      const last = items.at(-1);
      if (!items.length) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      const wasTop = dialogs.at(-1) === dialog;
      dialogs.splice(dialogs.indexOf(dialog), 1);
      updateLayers();
      if (!dialogs.length) { restoreBackground?.(); restoreBackground = undefined; }
      document.removeEventListener("keydown", keydown);
      if (wasTop && previousFocus?.isConnected && !previousFocus.closest("[inert]")) previousFocus.focus();
    };
  }, []);

  return createPortal(
    <div className="modal-overlay" ref={overlayRef} onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className={`modal-content ${className}`} role={role} aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-header">
          <h2 id={titleId} className="modal-title">{title}</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label={closeLabel}>&times;</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>, document.body
  );
}
