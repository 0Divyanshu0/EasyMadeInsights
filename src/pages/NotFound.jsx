import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="conversions-page">
      <div className="conversions-header">
        <h1>Page not found</h1>
        <p>The page you are looking for does not exist or may have moved.</p>
      </div>

      <div className="no-tools" style={{ maxWidth: 560, margin: "0 auto" }}>
        <p>
          Head back to the <Link to="/">dashboard</Link> or explore our
          <Link to="/conversions"> conversion tools</Link>.
        </p>
      </div>
    </div>
  );
}
