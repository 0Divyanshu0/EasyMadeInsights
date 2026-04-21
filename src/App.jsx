import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import WelcomeOverlay from "./components/WelcomeOverlay";

import "./styles/sidebar.css";
import "./styles/navbar.css";
import "./styles/dashboard.css";
import "./styles/upload.css";
import "./styles/kpi.css";
import "./styles/charts.css";
import "./styles/loader.css";
import "./styles/sheetselector.css";
import "./styles/ai-insights.css";
import "./styles/welcome.css";

const THEME_KEY = "easy-made-insights-theme";

function getInitialTheme() {
  const storedTheme = localStorage.getItem(THEME_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [showWelcome, setShowWelcome] = useState(true);
  const [activeSection, setActiveSection] = useState("upload");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowWelcome(false);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <WelcomeOverlay
        visible={showWelcome}
        onDismiss={() => setShowWelcome(false)}
      />

      <div className="layout">
        <Sidebar
          activeSection={activeSection}
          onNavigate={(sectionId) => {
            document.getElementById(sectionId)?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
            setActiveSection(sectionId);
          }}
        />
        <div className="main">
          <Navbar
            theme={theme}
            onToggleTheme={() =>
              setTheme((currentTheme) =>
                currentTheme === "light" ? "dark" : "light"
              )
            }
          />
          <Dashboard onSectionChange={setActiveSection} />
        </div>
      </div>
    </>
  );
}
