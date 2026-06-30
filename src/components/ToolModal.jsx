import JWTDecoder from "./tools/JWTDecoder";
import ImageConverter from "./tools/ImageConverter";
import FileComparison from "./tools/FileComparison";
import PDFToWord from "./tools/PDFToWord";
import WordToPDF from "./tools/WordToPDF";

export default function ToolModal({ tool, isOpen, onClose }) {
  if (!isOpen || !tool) {
    return null;
  }

  const renderTool = () => {
    switch (tool.id) {
      case "jwt-decoder":
        return <JWTDecoder />;
      case "image-converter":
        return <ImageConverter />;
      case "jpg-to-png":
      case "png-to-jpg":
      case "png-to-favicon":
        return <ImageConverter />;
      case "file-compare":
        return <FileComparison />;
      case "pdf-to-word":
        return <PDFToWord />;
      case "word-to-pdf":
        return <WordToPDF />;
      default:
        return <div>Tool not implemented yet</div>;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{tool.name}</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close tool">
            ×
          </button>
        </div>
        <div className="modal-body">{renderTool()}</div>
      </div>
    </div>
  );
}
