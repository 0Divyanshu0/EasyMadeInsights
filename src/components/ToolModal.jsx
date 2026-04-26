import JWTDecoder from "./tools/JWTDecoder";
import ImageConverter from "./tools/ImageConverter";
import FileComparison from "./tools/FileComparison";
import PDFToWord from "./tools/PDFToWord";

export default function ToolModal({ tool, isOpen, onClose }) {
  if (!isOpen || !tool) {
    return null;
  }

  const renderTool = () => {
    switch (tool.id) {
      case "jwt-decoder":
        return <JWTDecoder />;
      case "jpg-to-png":
        return <ImageConverter convertFrom="jpg" convertTo="png" />;
      case "png-to-jpg":
        return <ImageConverter convertFrom="png" convertTo="jpg" />;
      case "png-to-favicon":
        return <ImageConverter convertFrom="png" convertTo="favicon" />;
      case "file-compare":
        return <FileComparison />;
      case "pdf-to-word":
        return <PDFToWord />;
      default:
        return <div>Tool not implemented yet</div>;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{tool.name}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {renderTool()}
        </div>
      </div>
    </div>
  );
}