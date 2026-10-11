import PreviewModal from "../PreviewModal";
import { useEffect, useRef, useState } from "react";
import { convertImage, cropFromDrag } from "../../utils/imageConversion.js";
import { downloadBlob } from "../../utils/conversion.js";
import "../../styles/image-studio.css";

const INITIAL = {
  outputFormat: "png", rotation: 0, quality: 0.92,
  cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1, resizeWidth: 1, resizeHeight: 1,
  flipHorizontal: false, flipVertical: false, brightness: 0, contrast: 0,
  saturation: 100, warmth: 0, background: "transparent", backgroundColor: "#ffffff",
};
const LOOKS = {
  Original: { brightness: 0, contrast: 0, saturation: 100, warmth: 0 },
  Mono: { brightness: 0, contrast: 8, saturation: 0, warmth: 0 },
  Warm: { brightness: 3, contrast: 4, saturation: 105, warmth: 25 },
  Cool: { brightness: 0, contrast: 5, saturation: 95, warmth: -25 },
  Vivid: { brightness: 0, contrast: 12, saturation: 130, warmth: 0 },
};

function NumberField({ field, label, value, minimum = 1, onChange }) {
  return <label className="studio-number" htmlFor={field}><span>{label}</span>
    <input id={field} type="number" min={minimum} step="1" value={value}
      onChange={(event) => onChange(field, event.target.value === "" ? "" : Number(event.target.value))} />
  </label>;
}

function Slider({ field, label, value, min, max, step = 1, disabled, onChange }) {
  return <label className="studio-slider" htmlFor={field}><span>{label}<output>{value}</output></span>
    <input id={field} type="range" min={min} max={max} step={step} value={value} disabled={disabled}
      onChange={(event) => onChange(field, Number(event.target.value))} />
  </label>;
}

function defaults(image, format) {
  const scale = Math.min(1, 8192 / image.naturalWidth, 8192 / image.naturalHeight,
    Math.sqrt(32000000 / (image.naturalWidth * image.naturalHeight)));
  return { ...INITIAL, outputFormat: format, cropWidth: image.naturalWidth, cropHeight: image.naturalHeight,
    resizeWidth: Math.max(1, Math.floor(image.naturalWidth * scale)),
    resizeHeight: Math.max(1, Math.floor(image.naturalHeight * scale)) };
}

export default function ImageConverter({ initialFormat = "png" }) {
  const [source, setSource] = useState(null);
  const [settings, setSettings] = useState({ ...INITIAL, outputFormat: initialFormat });
  const [expanded, setExpanded] = useState(false);
  const [output, setOutput] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [view, setView] = useState("output");
  const [zoom, setZoom] = useState("fit");
  const [ratio, setRatio] = useState("");
  const [locked, setLocked] = useState(true);
  const [history, setHistory] = useState({ past: [], future: [] });
  const inputRef = useRef(null);
  const gestureRef = useRef(null);
  const selectionRef = useRef(0);
  const fingerprint = JSON.stringify(settings);
  const ready = output && output.fingerprint === fingerprint && output.source === source;

  useEffect(() => () => { selectionRef.current += 1; }, []);
  useEffect(() => () => { if (source) URL.revokeObjectURL(source.url); }, [source]);
  useEffect(() => () => { if (output) URL.revokeObjectURL(output.url); }, [output]);

  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    setBusy(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const result = await convertImage(source.image, settings);
        if (!cancelled) setOutput({ ...result, url: URL.createObjectURL(result.preview), fingerprint, source });
      } catch (err) {
        if (!cancelled) { setOutput(null); setError(err.message); }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 150);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [source, settings, fingerprint]);

  const commit = (next) => {
    if (JSON.stringify(next) === fingerprint) return;
    setHistory((current) => ({ past: [...current.past, settings].slice(-40), future: [] }));
    setSettings(next);
  };
  const change = (field, value) => {
    const next = { ...settings, [field]: value };
    if (locked && (field === "resizeWidth" || field === "resizeHeight") && Number.isFinite(value) && value > 0) {
      const aspect = settings.cropWidth / settings.cropHeight;
      if (field === "resizeWidth") next.resizeHeight = Math.max(1, Math.round(value / aspect));
      else next.resizeWidth = Math.max(1, Math.round(value * aspect));
    }
    commit(next);
  };
  const cropSettings = (base, crop) => ({ ...base, ...crop,
    resizeWidth: crop.cropWidth, resizeHeight: crop.cropHeight });
  const undo = () => {
    if (!history.past.length) return;
    setSettings(history.past.at(-1));
    setHistory({ past: history.past.slice(0, -1), future: [settings, ...history.future] });
  };
  const redo = () => {
    if (!history.future.length) return;
    setSettings(history.future[0]);
    setHistory({ past: [...history.past, settings].slice(-40), future: history.future.slice(1) });
  };

  const select = async (file) => {
    if (!file) return;
    const selection = ++selectionRef.current;
    setSource(null);
    setOutput(null);
    setError("");
    setBusy(true);
    setHistory({ past: [], future: [] });
    gestureRef.current = null;
    if (!/^image\/(png|jpeg|webp|bmp)$/.test(file.type) || !file.size || file.size > 25 * 1024 * 1024) {
      setError("Select a PNG, JPEG, WebP, or BMP image no larger than 25 MB.");
      setBusy(false);
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
      if (selection !== selectionRef.current) { URL.revokeObjectURL(url); return; }
      if (image.naturalWidth * image.naturalHeight > 80000000) throw new Error("Image exceeds the 80 megapixel source limit.");
      setSettings((current) => defaults(image, current.outputFormat));
      setRatio("");
      setView("output");
      setZoom("fit");
      setSource({ file, image, url });
    } catch (err) {
      URL.revokeObjectURL(url);
      if (selection === selectionRef.current) {
        setError(err.message || "This image could not be read. Try another file.");
        setBusy(false);
      }
    }
  };

  const setCropRatio = (value) => {
    setRatio(value);
    if (!value) return;
    const aspect = Number(value);
    const width = Math.round(Math.min(source.image.naturalWidth, source.image.naturalHeight * aspect));
    const height = Math.round(width / aspect);
    const crop = { cropX: Math.floor((source.image.naturalWidth - width) / 2),
      cropY: Math.floor((source.image.naturalHeight - height) / 2), cropWidth: width, cropHeight: height };
    commit(cropSettings(settings, crop));
    setView("crop");
  };
  const pointFor = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * source.image.naturalWidth,
      y: (event.clientY - rect.top) / rect.height * source.image.naturalHeight };
  };
  const startCrop = (event) => {
    if (event.button !== 0 || !source || gestureRef.current) return;
    event.preventDefault();
    const point = pointFor(event);
    const action = event.target.dataset.cropAction || "new";
    if (action !== "new") event.target.focus();
    const bounds = settings;
    let anchor = point;
    if (["nw", "ne", "sw", "se"].includes(action)) {
      anchor = { x: bounds.cropX + (action.includes("w") ? bounds.cropWidth : 0),
        y: bounds.cropY + (action.includes("n") ? bounds.cropHeight : 0) };
    }
    gestureRef.current = { pointerId: event.pointerId, start: point, anchor, action, before: settings };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveCrop = (event) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const point = pointFor(event);
    const { before } = gesture;
    let crop;
    if (gesture.action === "move") {
      crop = { cropX: Math.max(0, Math.min(source.image.naturalWidth - before.cropWidth, Math.round(before.cropX + point.x - gesture.start.x))),
        cropY: Math.max(0, Math.min(source.image.naturalHeight - before.cropHeight, Math.round(before.cropY + point.y - gesture.start.y))),
        cropWidth: before.cropWidth, cropHeight: before.cropHeight };
    } else {
      crop = cropFromDrag(gesture.anchor, point, source.image.naturalWidth, source.image.naturalHeight, ratio ? Number(ratio) : null);
    }
    gesture.latest = cropSettings(before, crop);
    setSettings(gesture.latest);
  };
  const endCrop = (event, cancel = false) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (cancel) setSettings(gesture.before);
    else if (gesture.latest && JSON.stringify(gesture.before) !== JSON.stringify(gesture.latest)) {
      setHistory((current) => ({ past: [...current.past, gesture.before].slice(-40), future: [] }));
    }
    gestureRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const keyboardCrop = (event) => {
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!directions[event.key]) return;
    event.preventDefault();
    const [dx, dy] = directions[event.key];
    const step = event.shiftKey ? 10 : 1;
    const action = event.currentTarget.dataset.cropAction;
    if (action === "move") {
      commit({ ...settings, cropX: Math.max(0, Math.min(source.image.naturalWidth - settings.cropWidth, settings.cropX + dx * step)),
        cropY: Math.max(0, Math.min(source.image.naturalHeight - settings.cropHeight, settings.cropY + dy * step)) });
    } else {
      const point = { x: settings.cropX + (action.includes("e") ? settings.cropWidth : 0) + dx * step,
        y: settings.cropY + (action.includes("s") ? settings.cropHeight : 0) + dy * step };
      const anchor = { x: settings.cropX + (action.includes("w") ? settings.cropWidth : 0),
        y: settings.cropY + (action.includes("n") ? settings.cropHeight : 0) };
      commit(cropSettings(settings, cropFromDrag(anchor, point, source.image.naturalWidth, source.image.naturalHeight, ratio ? Number(ratio) : null)));
    }
  };
  const numeric = (field, label, minimum = 1) => <NumberField key={field} field={field}
    label={label} minimum={minimum} value={settings[field]} onChange={change} />;
  const extension = settings.outputFormat === "favicon" ? "ico" : settings.outputFormat;
  const cropValid = source && [settings.cropX, settings.cropY, settings.cropWidth, settings.cropHeight].every(Number.isInteger)
    && settings.cropWidth > 0 && settings.cropHeight > 0;
  const position = source ? { left: settings.cropX / source.image.naturalWidth * 100 + "%",
    top: settings.cropY / source.image.naturalHeight * 100 + "%",
    width: settings.cropWidth / source.image.naturalWidth * 100 + "%",
    height: settings.cropHeight / source.image.naturalHeight * 100 + "%" } : {};

  return <div className="tool-content image-converter image-studio" aria-busy={busy}>
    <div className="studio-dropzone" data-dragging={dragging}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault(); setDragging(false);
        if (event.dataTransfer.files.length !== 1) { setError("Drop one image at a time."); return; }
        select(event.dataTransfer.files[0]);
      }}>
      <div><p className="studio-eyebrow">Your browser. Your creative workspace.</p>
        <h3>{source ? "Make it your own." : "Drop a photo. Find your finish."}</h3>
        <p>Drag &amp; drop PNG, JPG, WebP, or BMP. Up to 25 MB. Nothing is uploaded.</p></div>
      <label htmlFor="image-input" className="studio-upload-label">Select image file</label>
      <input ref={inputRef} id="image-input" type="file" accept="image/png,image/jpeg,image/webp,image/bmp"
        onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; select(file); }} />
    </div>
    {error && <p className="error-message" role="alert">{error}</p>}
    {source && <>
      <div className="studio-toolbar">
        <div className="studio-file"><img src={source.url} alt="Original" /><div><strong>{source.file.name}</strong>
          <span>{source.image.naturalWidth} x {source.image.naturalHeight} px | {(source.file.size / 1024).toFixed(1)} KB</span></div></div>
        <div className="studio-button-row">
          <button disabled={!history.past.length} onClick={undo}>Undo</button>
          <button disabled={!history.future.length} onClick={redo}>Redo</button>
          <button onClick={() => { commit(defaults(source.image, settings.outputFormat)); setRatio(""); }}>Reset edits</button>
        </div>
      </div>
      <div className="studio-layout">
        <aside className="studio-controls" aria-label="Photo editing controls">
          <fieldset><legend><span>01</span> Transform</legend>
            <label htmlFor="crop-ratio">Crop aspect ratio</label>
            <select id="crop-ratio" value={ratio} onChange={(event) => setCropRatio(event.target.value)}>
              <option value="">Freeform</option><option value="1">Square | 1:1</option><option value="1.3333333333333333">Landscape | 4:3</option>
              <option value="1.7777777777777777">Widescreen | 16:9</option><option value="0.75">Portrait | 3:4</option>
            </select>
            <button className="studio-crop-button" onClick={() => setView("crop")}>Crop visually</button>
            <div className="studio-pairs">{numeric("cropX", "Crop X", 0)}{numeric("cropY", "Crop Y", 0)}
              {numeric("cropWidth", "Crop width")}{numeric("cropHeight", "Crop height")}</div>
            <Slider field="image-rotation" label={"Rotation (" + settings.rotation + " degrees)"} value={settings.rotation} min={0} max={270} step={90}
              onChange={(_, value) => change("rotation", value)} />
            <div className="studio-button-row">
              <button aria-pressed={settings.flipHorizontal} onClick={() => change("flipHorizontal", !settings.flipHorizontal)}>Flip horizontal</button>
              <button aria-pressed={settings.flipVertical} onClick={() => change("flipVertical", !settings.flipVertical)}>Flip vertical</button>
            </div>
            <p className="studio-note">Crop first, then resize, flip, and rotate.</p>
          </fieldset>
          <fieldset><legend><span>02</span> Size</legend>
            <label className="studio-check"><input type="checkbox" checked={locked} onChange={(event) => setLocked(event.target.checked)} /> Keep aspect ratio</label>
            <div className="studio-pairs">{numeric("resizeWidth", "Resize width")}{numeric("resizeHeight", "Resize height")}</div>
            <div className="studio-button-row">
              <button onClick={() => commit({ ...settings, resizeWidth: settings.cropWidth, resizeHeight: settings.cropHeight })}>Crop size</button>
              <button onClick={() => commit({ ...settings, resizeWidth: Math.max(1, Math.round(settings.cropWidth / 2)), resizeHeight: Math.max(1, Math.round(settings.cropHeight / 2)) })}>50%</button>
              <button onClick={() => commit({ ...settings, resizeWidth: 1920, resizeHeight: Math.max(1, Math.round(1920 * settings.cropHeight / settings.cropWidth)) })}>1920 px wide</button>
            </div>
          </fieldset>
          <fieldset><legend><span>03</span> Color &amp; tone</legend>
            <div className="studio-looks">{Object.entries(LOOKS).map(([name, look]) => <button key={name}
              aria-pressed={Object.entries(look).every(([field, value]) => settings[field] === value)}
              onClick={() => commit({ ...settings, ...look })}>{name}</button>)}</div>
            <Slider field="brightness" label="Brightness" value={settings.brightness} min={-100} max={100} onChange={change} />
            <Slider field="contrast" label="Contrast" value={settings.contrast} min={-100} max={100} onChange={change} />
            <Slider field="saturation" label="Saturation" value={settings.saturation} min={0} max={200} onChange={change} />
            <Slider field="warmth" label="Warmth" value={settings.warmth} min={-100} max={100} onChange={change} />
          </fieldset>
          <fieldset><legend><span>04</span> Export</legend>
            <label htmlFor="image-format">Format</label>
            <select id="image-format" value={settings.outputFormat} onChange={(event) => change("outputFormat", event.target.value)}>
              <option value="png">PNG | lossless, transparent</option><option value="jpg">JPG | smaller photos</option>
              <option value="webp">WebP | modern web image</option><option value="favicon">Favicon (ICO, 64 x 64)</option>
            </select>
            <Slider field="image-quality" label={(settings.outputFormat === "webp" ? "WebP" : "JPEG") + " quality (" + Math.round(settings.quality * 100) + "%)"}
              value={settings.quality} min={0.5} max={1} step={0.01} disabled={!["jpg", "webp"].includes(settings.outputFormat)}
              onChange={(_, value) => change("quality", value)} />
            <label htmlFor="export-background">Export background</label>
            <select id="export-background" value={settings.background} onChange={(event) => change("background", event.target.value)}>
              <option value="transparent">Preserve transparency (JPG uses white)</option><option value="solid">Solid color</option>
            </select>
            {settings.background === "solid" && <label className="studio-color">Background color
              <input aria-label="Background color" type="color" value={settings.backgroundColor} onChange={(event) => change("backgroundColor", event.target.value)} />
              <span>{settings.backgroundColor}</span></label>}
            <p className="studio-note">ICO fits a 64 x 64 square without stretching. PNG quality is lossless, not adjustable.</p>
          </fieldset>
        </aside>
        <main className="studio-workspace">
          <button className="preview-expand" disabled={!ready || busy} onClick={() => setExpanded(true)}>Expand image preview</button>
          {expanded && ready && !busy && <PreviewModal key={fingerprint + output.url} title="Image export preview" type="image"
            url={output.url} width={output.width} height={output.height} onClose={() => setExpanded(false)}
            onDownload={() => downloadBlob(output.blob, source.file.name.replace(/\.[^.]+$/, "") + "-converted." + extension)} />}
          <div className="studio-stage-toolbar">
            <div className="studio-button-row" role="group" aria-label="Preview mode">
              <button aria-pressed={view === "output"} onClick={() => setView("output")}>Export preview</button>
              <button aria-pressed={view === "crop"} onClick={() => setView("crop")}>Crop image</button>
            </div>
            {view === "output" && <div className="studio-button-row" role="group" aria-label="Preview zoom">
              <button aria-pressed={zoom === "fit"} onClick={() => setZoom("fit")}>Fit</button>
              <button aria-pressed={zoom === "actual"} onClick={() => setZoom("actual")}>100%</button>
            </div>}
          </div>
          <div className={"studio-stage " + (view === "crop" ? "studio-crop-stage" : "")}>
            {view === "crop" ? <div className="studio-crop-surface" aria-label="Visual crop editor"
              onPointerDown={startCrop} onPointerMove={moveCrop} onPointerUp={(event) => endCrop(event)}
              onPointerCancel={(event) => endCrop(event, true)}>
              <img src={source.url} alt="Original crop source" draggable={false} />
              {cropValid && <>
                <svg className="studio-crop-shade" viewBox={"0 0 " + source.image.naturalWidth + " " + source.image.naturalHeight} aria-hidden="true">
                  <path fillRule="evenodd" d={"M0 0H" + source.image.naturalWidth + "V" + source.image.naturalHeight + "H0Z M" + settings.cropX + " " + settings.cropY + "h" + settings.cropWidth + "v" + settings.cropHeight + "h-" + settings.cropWidth + "Z"} />
                </svg>
                <button className="studio-crop-selection" data-crop-action="move" aria-label="Move crop selection"
                  style={position} onKeyDown={keyboardCrop}><span /><span /></button>
                {["nw", "ne", "sw", "se"].map((corner) => <button key={corner} className="studio-crop-handle"
                  aria-label={"Resize crop " + corner} data-crop-action={corner} onKeyDown={keyboardCrop}
                  style={{ left: (settings.cropX + (corner.includes("e") ? settings.cropWidth : 0)) / source.image.naturalWidth * 100 + "%",
                    top: (settings.cropY + (corner.includes("s") ? settings.cropHeight : 0)) / source.image.naturalHeight * 100 + "%" }} />)}
              </>}
            </div> : ready ? <img src={output.url} alt="Converted" className="studio-export-image" data-zoom={zoom}
              style={zoom === "actual" ? { width: output.width, height: output.height } : undefined} /> :
              <p role="status">{busy ? "Rendering your export..." : "Correct the settings to generate a preview."}</p>}
          </div>
          <div className="studio-preview-caption">
            <strong>{view === "crop" ? "Compose on the original" : "What you see is what you export"}</strong>
            <p>{view === "crop" ? "Drag outside the selection to draw a crop. Drag inside to move it; use corner handles to resize. Arrow keys move focused controls; Shift moves 10 pixels. Visual crops update output dimensions." :
              "This preview is the encoded download, including quality and color adjustments. Checkerboard indicates transparency and is not exported. Browser export uses sRGB; displays and external viewers may differ."}</p>
          </div>
          <footer className="studio-export-footer">
            <div><span className="studio-eyebrow">Export details</span>
              <p role="status">{ready ? "Ready: " + output.width + " x " + output.height + " px | " + (output.blob.size / 1024).toFixed(1) + " KB | " + extension.toUpperCase() :
                "Preview updates automatically when you change settings."}</p></div>
            <button className="convert-btn" disabled={!ready || busy}
              onClick={() => downloadBlob(output.blob, source.file.name.replace(/\.[^.]+$/, "") + "-converted." + extension)}>
              Download converted image
            </button>
          </footer>
        </main>
      </div>
    </>}
  </div>;
}
