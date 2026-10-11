function decodePart(part, label) {
  try {
    if (!part || !/^[A-Za-z0-9_-]+$/.test(part)) throw new Error();
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(binary, (char) => char.charCodeAt(0))
    ));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw new Error(`Invalid JWT ${label}. Expected a Base64URL-encoded JSON object.`);
  }
}

export function decodeJwt(token) {
  const parts = token.trim().split(".");
  if (parts.length !== 3) throw new Error("Expected a JWT with three parts separated by dots.");
  const header = decodePart(parts[0], "header");
  const payload = decodePart(parts[1], "payload");
  if (typeof header.alg !== "string" || !header.alg) throw new Error("JWT header is missing its algorithm.");
  if (!/^[A-Za-z0-9_-]*$/.test(parts[2]) || (!parts[2] && header.alg !== "none")) {
    throw new Error("Invalid JWT signature encoding.");
  }
  return { header, payload, signature: parts[2] };
}
