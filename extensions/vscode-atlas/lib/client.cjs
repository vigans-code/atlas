const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

class AtlasClient {
  constructor(baseUrl, token, fetchImplementation = globalThis.fetch) {
    this.baseUrl = validateBridgeUrl(baseUrl);
    if (typeof token !== "string" || token.length < 32 || token.length > 200) throw new Error("Atlas pairing token is invalid.");
    if (typeof fetchImplementation !== "function") throw new Error("This VS Code version does not provide the required network client.");
    this.token = token;
    this.fetch = fetchImplementation;
  }

  async checkConnection() {
    return this.request("/v1/session", { method: "GET" });
  }

  async chat(messages, mode = "code") {
    const response = await this.request("/v1/chat", {
      method: "POST",
      body: JSON.stringify({ mode, messages }),
    });
    if (typeof response?.content !== "string" || !response.content.trim()) throw new Error("Atlas returned an empty response.");
    return response.content.trim();
  }

  async request(pathname, options) {
    const response = await this.fetch(new URL(pathname, this.baseUrl), {
      ...options,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      redirect: "error",
      signal: AbortSignal.timeout(120_000),
    });
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_RESPONSE_BYTES) throw new Error("Atlas returned an oversized response.");
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) throw new Error("Atlas returned an oversized response.");
    let value;
    try {
      value = text ? JSON.parse(text) : null;
    } catch {
      throw new Error("Atlas returned an invalid response.");
    }
    if (!response.ok) throw new Error(String(value?.error || `Atlas request failed (${response.status}).`).slice(0, 500));
    return value;
  }
}

function validateBridgeUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Atlas bridge URL is invalid.");
  }
  const loopback = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost" || parsed.hostname === "[::1]";
  if (parsed.protocol !== "http:" || !loopback || parsed.username || parsed.password || (parsed.pathname !== "/" && parsed.pathname !== "")) {
    throw new Error("Atlas bridge must be a credential-free loopback HTTP address.");
  }
  parsed.pathname = "/";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

module.exports = { AtlasClient, validateBridgeUrl };
