import React, { useState } from "react";

export default function Sidebar() {
  const [activeItem, setActiveItem] = useState("Dashboard");

  return (
    <aside className="sidebar">
      <div className="brand">
        <h1>EasyMadeInsights</h1>
        <small>Beta</small>
      </div>

      <nav>
        <ul>
          {["Dashboard", "Upload", "Reports", "About"].map((item) => (
            <li key={item}>
              <button
                type="button"
                className={activeItem === item ? "active" : ""}
                onClick={() => setActiveItem(item)}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <small>v0.1 | No login</small>
      </div>
    </aside>
  );
}
