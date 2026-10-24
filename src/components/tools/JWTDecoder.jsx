import { useState } from "react";
import { decodeJwt } from "../../utils/jwt.js";

export default function JWTDecoder() {
  const [token, setToken] = useState("");
  const [decoded, setDecoded] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const decodeJWT = () => {
    setError("");
    setDecoded(null);
    setMessage("");

    if (!token.trim()) {
      setError("Please paste a JWT token");
      return;
    }

    try {
      setDecoded(decodeJwt(token));
    } catch (err) {
      setError(err.message || "Failed to decode JWT");
    }
  };

  return (
    <div className="tool-content jwt-decoder">
      <p className="tool-input-hint">Tokens can contain credentials. Decoding happens in your browser and does not verify the signature.</p>
      <div className="input-section">
        <label htmlFor="jwt-token">Paste your JWT token:</label>
        <textarea
          id="jwt-token"
          value={token}
          onChange={(e) => { setToken(e.target.value); setDecoded(null); setError(""); setMessage(""); }}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          className="token-input"
        />
        <div className="tool-actions">
        <button type="button" className="tool-secondary-button" disabled={!token && !decoded && !error} onClick={() => {
          setToken(""); setDecoded(null); setError(""); setMessage("");
        }}>Clear token</button>
        <button className="decode-btn" onClick={decodeJWT}>
          Decode
        </button>
        </div>
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}
      {message && <div className="info-message" role="status">{message}</div>}

      {decoded && (
        <div className="decoded-section">
          <p className="info-box">Decoded only. The signature has not been verified.</p>
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

          <button className="copy-btn" onClick={async () => {
            try {
              await navigator.clipboard.writeText(JSON.stringify(decoded, null, 2));
              setMessage("Decoded token copied.");
              setError("");
            } catch {
              setError("Could not copy. Select and copy the decoded text manually.");
            }
          }}>
            Copy All to Clipboard
          </button>
        </div>
      )}
    </div>
  );
}
