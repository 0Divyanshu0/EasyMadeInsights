import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import EasyMadeConversions from "./pages/EasyMadeConversions";
import NotFound from "./pages/NotFound";
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
import "./styles/conversions.css";
import "./styles/tools.css";

const THEME_KEY = "easy-made-insights-theme";
const SITE_URL = "https://easymadeinsights.web.app";

const routeMeta = {
  "/": {
    title: "EasyMadeInsights | Spreadsheet AI Insights",
    description:
      "Analyze spreadsheets and turn raw business data into KPI dashboards, AI summaries, and actionable insights.",
    schemaType: "WebApplication",
    name: "EasyMadeInsights",
    keywords: [
      "Excel analytics",
      "KPI dashboard",
      "AI spreadsheet insights",
      "business data analysis",
    ],
  },
  "/conversions": {
    title: "EasyMadeConversions | File & Document Tools",
    description:
      "Convert files, compare documents, decode JWTs, and streamline file utilities with EasyMadeConversions.",
    schemaType: "CollectionPage",
    name: "EasyMadeConversions",
    keywords: [
      "PDF to Word",
      "Word to PDF",
      "image conversion",
      "file comparison tool",
    ],
  },
  "/404": {
    title: "Page Not Found | EasyMadeInsights",
    description:
      "The page you requested could not be found. Explore EasyMadeInsights data insights and conversion tools.",
    schemaType: "WebPage",
    name: "Not Found",
    keywords: ["EasyMadeInsights", "not found"],
  },
};

function getInitialTheme() {
  const storedTheme = localStorage.getItem(THEME_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function buildJsonLd(pathname) {
  const pageMeta = routeMeta[pathname] || routeMeta["/"];
  const canonicalUrl = `${SITE_URL}${pathname}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": pageMeta.schemaType,
        name: pageMeta.name,
        description: pageMeta.description,
        url: canonicalUrl,
        keywords: pageMeta.keywords?.join(", ") || "EasyMadeInsights",
        inLanguage: "en-US",
        isAccessibleForFree: true,
      },
      {
        "@type": "Organization",
        name: "EasyMadeInsights",
        url: SITE_URL,
        logo: `${SITE_URL}/easy-made-insights-logo.png`,
        areaServed: "Worldwide",
        sameAs: [SITE_URL],
      },
    ],
  };
}

function AppShell() {
  const location = useLocation();
  const [theme, setTheme] = useState(getInitialTheme());
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

  useEffect(() => {
    const metaDescription = document.querySelector('meta[name="description"]');
    const metaKeyword = document.querySelector('meta[name="keywords"]');
    const metaOgTitle = document.querySelector('meta[property="og:title"]');
    const metaOgDescription = document.querySelector('meta[property="og:description"]');
    const metaOgUrl = document.querySelector('meta[property="og:url"]');
    const metaTwitterTitle = document.querySelector('meta[name="twitter:title"]');
    const metaTwitterDescription = document.querySelector(
      'meta[name="twitter:description"]'
    );
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    const existingScript = document.querySelector("#app-schema");
    const currentPath = location.pathname || "/";
    const pageMeta = routeMeta[currentPath] || routeMeta["/"];
    const canonicalUrl = `${SITE_URL}${currentPath}`;

    document.title = pageMeta.title;

    if (metaDescription) {
      metaDescription.setAttribute("content", pageMeta.description);
    }

    if (metaKeyword) {
      metaKeyword.setAttribute("content", pageMeta.keywords?.join(", ") || "EasyMadeInsights");
    }

    if (metaOgTitle) {
      metaOgTitle.setAttribute("content", pageMeta.title);
    }

    if (metaOgDescription) {
      metaOgDescription.setAttribute("content", pageMeta.description);
    }

    if (metaOgUrl) {
      metaOgUrl.setAttribute("content", canonicalUrl);
    }

    if (metaTwitterTitle) {
      metaTwitterTitle.setAttribute("content", pageMeta.title);
    }

    if (metaTwitterDescription) {
      metaTwitterDescription.setAttribute("content", pageMeta.description);
    }

    if (canonicalLink) {
      canonicalLink.setAttribute("href", canonicalUrl);
    } else {
      const newCanonical = document.createElement("link");
      newCanonical.setAttribute("rel", "canonical");
      newCanonical.setAttribute("href", canonicalUrl);
      document.head.appendChild(newCanonical);
    }

    const schemaScript = document.createElement("script");
    schemaScript.id = "app-schema";
    schemaScript.type = "application/ld+json";
    schemaScript.textContent = JSON.stringify(buildJsonLd(currentPath));

    if (existingScript) {
      existingScript.replaceWith(schemaScript);
    } else {
      document.head.appendChild(schemaScript);
    }
  }, [location.pathname]);

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
          <Routes>
            <Route path="/" element={<Dashboard onSectionChange={setActiveSection} />} />
            <Route path="/conversions" element={<EasyMadeConversions />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
