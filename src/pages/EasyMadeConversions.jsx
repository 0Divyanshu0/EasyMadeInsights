import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import WelcomeOverlay from "../components/WelcomeOverlay.jsx";
import ToolModal from "../components/ToolModal.jsx";

const tools = [
  {
    id: "pdf-to-word",
    name: "PDF to Word Converter",
    description: "Convert PDF documents to editable Word files",
    category: "File Tools",
    icon: "📄",
  },
  {
    id: "word-to-pdf",
    name: "Word to PDF Converter",
    description: "Convert Word documents to PDF format",
    category: "File Tools",
    icon: "📄",
  },
  {
    id: "file-compare",
    name: "File Comparison Tool",
    description: "Compare files with GitHub-style diff view",
    category: "File Tools",
    icon: "🔍",
  },
  {
    id: "jpg-to-png",
    name: "JPG to PNG",
    description: "Convert JPG images to PNG format",
    category: "Image Tools",
    icon: "🖼️",
  },
  {
    id: "png-to-jpg",
    name: "PNG to JPG",
    description: "Convert PNG images to JPG format",
    category: "Image Tools",
    icon: "🖼️",
  },
  {
    id: "png-to-favicon",
    name: "PNG to Favicon",
    description: "Convert PNG images to favicon format",
    category: "Image Tools",
    icon: "🌐",
  },
  {
    id: "jwt-decoder",
    name: "JWT Decoder",
    description: "Decode and inspect JWT tokens",
    category: "Developer Tools",
    icon: "🔐",
  },
];

const categories = ["All", "File Tools", "Image Tools", "Developer Tools"];

export default function EasyMadeConversions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showWelcome, setShowWelcome] = useState(true);
  const [selectedTool, setSelectedTool] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 2600);

    return () => clearTimeout(timer);
  }, []);

  const handleToolClick = (tool) => {
    setSelectedTool(tool);
    setIsModalOpen(true);
  };

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || tool.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <WelcomeOverlay
        visible={showWelcome}
        onDismiss={() => setShowWelcome(false)}
        logo="/EasyMadeConversion_logo.png"
        title="EasyMadeConversion"
        description="Powerful tools for file conversion and development. Transform your files with ease."
        features={["PDF to Word", "Word to PDF", "Image conversion", "Developer utilities"]}
        buttonText="Enter Tools"
      />
      <div className="conversions-page">
        <div className="conversions-header">
          <button className="back-button" onClick={() => navigate("/")}>
            Back to Dashboard
          </button>
          <h1>EasyMadeConversions</h1>
          <p>Powerful tools for file conversion and development</p>
        </div>

        <div className="conversions-controls">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search tools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="category-filters">
            {categories.map((category) => (
              <button
                key={category}
                className={selectedCategory === category ? "active" : ""}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="tools-grid">
          {filteredTools.map((tool) => (
            <div key={tool.id} className="tool-card">
              <div className="tool-icon">{tool.icon}</div>
              <h3 className="tool-name">{tool.name}</h3>
              <p className="tool-description">{tool.description}</p>
              <button
                className="use-tool-btn"
                onClick={() => handleToolClick(tool)}
              >
                Use Tool
              </button>
            </div>
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="no-tools">
            <p>No tools found matching your criteria.</p>
          </div>
        )}

        <ToolModal
          tool={selectedTool}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </>
  );
}
