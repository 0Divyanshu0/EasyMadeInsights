import { useState } from "react";

export default function ImageConverter({ convertFrom, convertTo }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [isConverting, setIsConverting] = useState(false);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = [`image/${convertFrom}`, "image/png", "image/jpeg"];
    if (!validTypes.some(type => selectedFile.type === type || selectedFile.type.includes(convertFrom.toLowerCase()))) {
      setError(`Please select a valid ${convertFrom.toUpperCase()} file`);
      return;
    }

    setError("");
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const convertImage = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setIsConverting(true);
    setError("");

    try {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (convertTo === "favicon") {
          canvas.width = 64;
          canvas.height = 64;
          ctx.drawImage(img, 0, 0, 64, 64);
        } else {
          ctx.drawImage(img, 0, 0);
        }

        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;

          const ext = convertTo === "favicon" ? "ico" : convertTo;
          link.download = `converted-image.${ext}`;
          link.click();

          URL.revokeObjectURL(url);
          setIsConverting(false);
        }, `image/${convertTo === "favicon" ? "x-icon" : convertTo}`);
      };
      img.onerror = () => {
        setError("Failed to load image");
        setIsConverting(false);
      };
      img.src = preview;
    } catch (err) {
      setError("Conversion failed: " + err.message);
      setIsConverting(false);
    }
  };

  return (
    <div className="tool-content image-converter">
      <div className="upload-section">
        <label htmlFor="image-input" className="file-label">
          Select {convertFrom.toUpperCase()} File:
        </label>
        <input
          id="image-input"
          type="file"
          accept={`image/${convertFrom},image/${convertFrom === "jpg" ? "jpeg" : convertFrom}`}
          onChange={handleFileSelect}
          className="file-input"
        />
        {file && <p className="file-name">Selected: {file.name}</p>}
      </div>

      {preview && (
        <div className="preview-section">
          <h4>Preview</h4>
          <img src={preview} alt="Preview" className="preview-image" />
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <button
        className="convert-btn"
        onClick={convertImage}
        disabled={!file || isConverting}
      >
        {isConverting ? "Converting..." : `Convert to ${convertTo.toUpperCase()}`}
      </button>
    </div>
  );
}