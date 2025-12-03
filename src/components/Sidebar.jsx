import React from "react";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <h1>EasyMadeInsights</h1>
        <small>Beta</small>
      </div>

      <nav>
        <ul>
          <li className="active">Dashboard</li>
          <li>Upload</li>
          <li>Reports</li>
          <li>About</li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <small>v0.1 • No login</small>
      </div>
    </aside>
  );
}
