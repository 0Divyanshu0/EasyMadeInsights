import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";

import "./styles/sidebar.css";
import "./styles/navbar.css";
import "./styles/dashboard.css";
import "./styles/upload.css";
import "./styles/kpi.css";
import "./styles/charts.css";

export default function App() {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <Navbar />
        <Dashboard />
      </div>
    </div>
  );
}
