import { useState } from "react";

export default function JWTDecoder() {
  const [token, setToken] = useState("");
  const [decoded, setDecoded] = useState(null);
  const [error, setError] = useState("");

  const decodeJWT = () => {
    setError("");
    setDecoded(null);

    if (!token.trim()) {
      setError("Please paste a JWT token");
      return;
    }

    try {
      const parts = token.trim().split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format. Expected 3 parts separated by dots.");
      }

      const [headerB64, payloadB64, signature] = parts;

      const decode = (str) => {
        try {
          return JSON.parse(atob(str));
        } catch {
          return atob(str);
        }
      };

      const header = decode(headerB64);
      const payload = decode(payloadB64);

      setDecoded({
        header,
        payload,
        signature,
        valid: true,
      });
    } catch (err) {
      setError(err.message || "Failed to decode JWT");
    }
  };

  return (
    <div className="tool-content jwt-decoder">
      <div className="input-section">
        <label>Paste your JWT token:</label>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          className="token-input"
        />
        <button className="decode-btn" onClick={decodeJWT}>
          Decode
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {decoded && (
        <div className="decoded-section">
          <div className="decoded-part jwt-header">
            <h4>Header</h4>
            <pre>{JSON.stringify(decoded.header, null, 2)}</pre>
          </div>

          <div className="decoded-part jwt-payload">
            <h4>Payload</h4>
            <pre>{JSON.stringify(decoded.payload, null, 2)}</pre>
          </div>

          <div className="decoded-part jwt-signature">
            <h4>Signature</h4>
            <pre>{decoded.signature}</pre>
          </div>

          <button className="copy-btn" onClick={() => {
            navigator.clipboard.writeText(JSON.stringify({
              header: decoded.header,
              payload: decoded.payload,
              signature: decoded.signature,
            }, null, 2));
          }}>
            Copy All to Clipboard
          </button>
        </div>
      )}
    </div>
  );
}