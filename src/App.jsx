import { useEffect, useState } from "react";
import { createBrowserRouter, RouterProvider, Routes, Route, useLocation, useNavigate, useBlocker } from "react-router-dom";
import Dialog from "./components/Dialog";
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
import "./styles/welcome.css";
import "./styles/conversions.css";
import "./styles/tools.css";
import "./styles/dialogs.css";

const THEME_KEY = "easy-made-insights-theme";
const SITE_URL = "https://easymadeinsights.web.app";

function normalizedPath(pathname) {
  return pathname.replace(/\/+$/, "") || "/";
}

const routeMeta = {
  "/": {
    title: "EasyMadeInsights | Spreadsheet Analytics",
    description:
      "Analyze spreadsheets and turn raw business data into KPI dashboards, customizable charts, and local workbook takeaways.",
    schemaType: "WebApplication",
    name: "EasyMadeInsights",
    keywords: [
      "Excel analytics",
      "KPI dashboard",
      "spreadsheet insights",
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
  const navigate = useNavigate();
  const isConversions = normalizedPath(location.pathname) === "/conversions";
  const isDashboard = normalizedPath(location.pathname) === "/";
  const [hasWorkbook, setHasWorkbook] = useState(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    (normalizedPath(currentLocation.pathname) === "/conversions") !== (normalizedPath(nextLocation.pathname) === "/conversions")
  );
  const switchWorkspace = () => navigate(isDashboard ? "/conversions" : "/");
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
    const currentPath = normalizedPath(location.pathname);
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
        visible={showWelcome && isDashboard}
        onDismiss={() => setShowWelcome(false)}
      />

      {blocker.state === "blocked" && <Dialog role="alertdialog" className="workspace-confirmation"
        title={isConversions ? "Switch to EasyMadeInsights?" : "Switch to EasyMadeConversions?"}
        closeLabel="Stay in this workspace" onClose={() => blocker.reset()}>
        <p>{isConversions
          ? "Leaving this workspace clears selected files, edits, and conversion results. Download anything you want to keep before switching."
          : hasWorkbook
            ? "Your uploaded workbook, dashboard, and reporting selections will be cleared when you leave. You will need to upload the workbook again when you return."
            : "You are moving to the file tools workspace. Spreadsheet navigation is only available in EasyMadeInsights."}</p>
        <div className="tool-actions">
          <button className="workspace-switch" onClick={() => blocker.reset()}>Stay here</button>
          <button className="convert-btn" onClick={() => blocker.proceed()}>Switch workspace</button>
        </div>
      </Dialog>}
      <div className="layout">
        <Sidebar
          activeSection={activeSection}
          isConversions={isConversions}
          isDashboard={isDashboard}
          onSwitchWorkspace={switchWorkspace}
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
            isConversions={isConversions}
            onSwitchWorkspace={switchWorkspace}
            onToggleTheme={() =>
              setTheme((currentTheme) =>
                currentTheme === "light" ? "dark" : "light"
              )
            }
          />
          <Routes>
            <Route path="/" element={<Dashboard onSectionChange={setActiveSection} onSessionChange={setHasWorkbook} />} />
            <Route path="/conversions" element={<EasyMadeConversions />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </>
  );
}

const router = createBrowserRouter([{ path: "*", element: <AppShell /> }]);

export default function App() {
  return <RouterProvider router={router} />;
}
