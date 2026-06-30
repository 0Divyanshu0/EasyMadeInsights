import { useState, useEffect } from "react";

const OUTPUT_OPTIONS = [
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPG" },
  { value: "favicon", label: "Favicon (ICO)" },
];

export default function ImageConverter() {
  const [file, setFile] = useState(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [outputBlob, setOutputBlob] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [outputFormat, setOutputFormat] = useState("png");
  const [rotation, setRotation] = useState(0);
  const [quality, setQuality] = useState(0.92);

  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);

  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropWidth, setCropWidth] = useState(0);
  const [cropHeight, setCropHeight] = useState(0);

  const [resizeWidth, setResizeWidth] = useState(0);
  const [resizeHeight, setResizeHeight] = useState(0);

  const resetOutput = () => {
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
    }
    setOutputUrl("");
    setOutputBlob(null);
  };

  // Auto-update preview when controls change
  useEffect(() => {
    if (file && sourceUrl) {
      const autoProcess = async () => {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";

          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = sourceUrl;
          });

          const safeCropX = Math.max(0, Math.min(cropX, originalWidth - 1));
          const safeCropY = Math.max(0, Math.min(cropY, originalHeight - 1));
          const safeCropW = Math.max(1, Math.min(cropWidth, originalWidth - safeCropX));
          const safeCropH = Math.max(1, Math.min(cropHeight, originalHeight - safeCropY));
          const outW = outputFormat === "favicon" ? 64 : Math.max(1, resizeWidth || safeCropW);
          const outH = outputFormat === "favicon" ? 64 : Math.max(1, resizeHeight || safeCropH);

          const canvas = document.createElement("canvas");
          canvas.width = outW;
          canvas.height = outH;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.save();
          ctx.translate(outW / 2, outH / 2);
          ctx.rotate((rotation * Math.PI) / 180);

          ctx.drawImage(
            img,
            safeCropX,
            safeCropY,
            safeCropW,
            safeCropH,
            -outW / 2,
            -outH / 2,
            outW,
            outH
          );
          ctx.restore();

          const mimeType = outputFormat === "jpg" ? "image/jpeg" : "image/png";
          const blob = await new Promise((resolve) => {
            canvas.toBlob(
              (result) => {
                resolve(result);
              },
              mimeType,
              quality
            );
          });

          if (blob) {
            if (outputUrl) {
              URL.revokeObjectURL(outputUrl);
            }
            const nextUrl = URL.createObjectURL(blob);
            setOutputBlob(blob);
            setOutputUrl(nextUrl);
          }
        } catch (err) {
          console.error("Auto-process error:", err);
        }
      };

      autoProcess();
    }
  }, [sourceUrl, outputFormat, rotation, quality, cropX, cropY, cropWidth, cropHeight, resizeWidth, resizeHeight, file, originalWidth, originalHeight, outputUrl]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    setFile(selectedFile);
    setError("");
    setMessage("");
    resetOutput();

    const url = URL.createObjectURL(selectedFile);
    setSourceUrl(url);

    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setOriginalWidth(w);
      setOriginalHeight(h);
      setCropX(0);
      setCropY(0);
      setCropWidth(w);
      setCropHeight(h);
      setResizeWidth(w);
      setResizeHeight(h);
    };
    img.src = url;
  };

  const processImage = async () => {
    if (!file || !sourceUrl) {
      setError("Please upload an image first.");
      return;
    }

    // Preview is already auto-updated, this just confirms and shows message
    setMessage("✅ Image settings applied! Ready to download.");
  };

  const downloadOutput = () => {
    if (!outputBlob || !file) return;
    const base = file.name.replace(/\.[^.]+$/, "");
    const ext = outputFormat === "favicon" ? "ico" : outputFormat;
    const link = document.createElement("a");
    link.href = outputUrl;
    link.download = `${base}-converted.${ext}`;
    link.click();
  };

  return (
    <div className="tool-content image-converter">
      <div className="upload-section">
        <label htmlFor="image-input" className="file-label">
          Select Image File
        </label>
        <input
          id="image-input"
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/bmp"
          onChange={handleFileSelect}
          className="file-input"
        />
        {file && <p className="file-name">Selected: {file.name}</p>}
      </div>

      {sourceUrl && (
        <>
          <div className="image-controls-grid">
            <div className="comparison-panel">
              <div className="comparison-panel-header">Output Settings</div>

              <label>Format</label>
              <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)}>
                {OUTPUT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <label>Rotation ({rotation}°)</label>
              <input
                type="range"
                min="0"
                max="270"
                step="90"
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
              />

              <label>Quality ({Math.round(quality * 100)}%)</label>
              <input
                type="range"
                min="0.5"
                max="1"
                step="0.01"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                disabled={outputFormat === "png" || outputFormat === "favicon"}
              />
            </div>

            <div className="comparison-panel">
              <div className="comparison-panel-header">Crop (Pixels)</div>
              <div className="image-input-row">
                <label>X</label>
                <input type="number" value={cropX} min="0" onChange={(e) => setCropX(Number(e.target.value))} />
                <label>Y</label>
                <input type="number" value={cropY} min="0" onChange={(e) => setCropY(Number(e.target.value))} />
              </div>
              <div className="image-input-row">
                <label>W</label>
                <input type="number" value={cropWidth} min="1" onChange={(e) => setCropWidth(Number(e.target.value))} />
                <label>H</label>
                <input type="number" value={cropHeight} min="1" onChange={(e) => setCropHeight(Number(e.target.value))} />
              </div>

              <div className="comparison-panel-header">Resize (Resolution)</div>
              <div className="image-input-row">
                <label>W</label>
                <input type="number" value={resizeWidth} min="1" onChange={(e) => setResizeWidth(Number(e.target.value))} />
                <label>H</label>
                <input type="number" value={resizeHeight} min="1" onChange={(e) => setResizeHeight(Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div className="preview-section">
            <h4>Preview - Side by Side</h4>
            <div className="preview-split">
              <div className="preview-panel">
                <div className="preview-panel-header">Original</div>
                <div className="preview-content preview-content-embed">
                  <img src={sourceUrl} alt="Original" className="preview-image" />
                </div>
              </div>
              <div className="preview-panel">
                <div className="preview-panel-header">Output</div>
                <div className="preview-content preview-content-embed">
                  {outputUrl ? (
                    <img src={outputUrl} alt="Converted" className="preview-image" />
                  ) : (
                    <p className="info-message">Run processing to see output preview.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {error && <div className="error-message">{error}</div>}
      {message && <div className="info-message">{message}</div>}

      <button className="convert-btn" onClick={processImage} disabled={!file}>
        {outputUrl ? "✓ Preview Ready" : "Generate Preview"}
      </button>

      {outputUrl && (
        <button className="convert-btn" onClick={downloadOutput}>
          Download Converted Image
        </button>
      )}
    </div>
  );
}
