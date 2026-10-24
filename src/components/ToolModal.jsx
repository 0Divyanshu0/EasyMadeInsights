import { useEffect, useMemo } from "react";
import Dialog from "./Dialog";
import JWTDecoder from "./tools/JWTDecoder";
import ImageConverter from "./tools/ImageConverter";
import FileComparison from "./tools/FileComparison";
import PDFToWord from "./tools/PDFToWord";
import WordToPDF from "./tools/WordToPDF";

export default function ToolModal({ tool, isOpen, onClose }) {
  const toolMeta = useMemo(
    () => ({
      "pdf-to-word": {
        title: "PDF to Word Converter | EasyMadeInsights",
        description: "Convert PDF documents to editable Word files with a fast browser-based workflow.",
      },
      "word-to-pdf": {
        title: "Word to PDF Converter | EasyMadeInsights",
        description: "Convert DOC and DOCX files into polished PDF documents in seconds.",
      },
      "file-compare": {
        title: "File Comparison Tool | EasyMadeInsights",
        description: "Compare file content side-by-side with a GitHub-style diff view for reviews.",
      },
      "image-converter": {
        title: "Image Converter Studio | EasyMadeInsights",
        description: "Convert, resize, crop, and rotate images for web, docs, and marketing content.",
      },
      "jwt-decoder": {
        title: "JWT Decoder | EasyMadeInsights",
        description: "Inspect JWT headers, payloads, and signatures for debugging and validation.",
      },
    }),
    []
  );

  const currentMeta = useMemo(
    () =>
      toolMeta[tool?.id] || {
        title: `${tool?.name || "Tool"} | EasyMadeInsights`,
        description: tool?.description || "EasyMadeInsights tool.",
      },
    [tool, toolMeta]
  );

  useEffect(() => {
    if (!isOpen || !tool) return;

    const previousTitle = document.title;
    const savedMeta = Array.from(document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"]'))
      .map((element) => [element, element.getAttribute("content")]);

    document.title = currentMeta.title;

    const metaDescription = document.querySelector('meta[name="description"]');
    const metaOgTitle = document.querySelector('meta[property="og:title"]');
    const metaOgDescription = document.querySelector('meta[property="og:description"]');

    if (metaDescription) {
      metaDescription.setAttribute("content", currentMeta.description);
    }

    if (metaOgTitle) {
      metaOgTitle.setAttribute("content", currentMeta.title);
    }

    if (metaOgDescription) {
      metaOgDescription.setAttribute("content", currentMeta.description);
    }
    return () => {
      document.title = previousTitle;
      savedMeta.forEach(([element, content]) => content === null ? element.removeAttribute("content") : element.setAttribute("content", content));
    };
  }, [currentMeta, tool, isOpen]);

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
        return <ImageConverter initialFormat="png" />;
      case "png-to-jpg":
        return <ImageConverter initialFormat="jpg" />;
      case "png-to-favicon":
        return <ImageConverter initialFormat="favicon" />;
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

  return <Dialog title={tool.name} onClose={onClose} closeLabel="Close tool" backLabel="Back to tools"
    className={["image-converter", "jpg-to-png", "png-to-jpg", "png-to-favicon"].includes(tool.id) ? "image-studio-modal" : ""}>
    {renderTool()}
  </Dialog>;
}
