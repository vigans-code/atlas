const http = require("node:http");
const { timingSafeEqual } = require("node:crypto");

const COMPANION_HOST = "127.0.0.1";
const COMPANION_PORT = 47635;
const MAX_BODY_BYTES = 256 * 1024;
const MAX_CONCURRENT_CHATS = 2;

function startCompanionServer({ getToken, chat, port = COMPANION_PORT }) {
  if (typeof getToken !== "function" || typeof chat !== "function") throw new Error("Companion server configuration is invalid.");
  let activeChats = 0;
  const recentRequests = [];

  const server = http.createServer(async (request, response) => {
    setSecurityHeaders(response);
    const url = new URL(request.url || "/", `http://${COMPANION_HOST}`);

    if (request.method === "GET" && url.pathname === "/v1/health") {
      return sendJson(response, 200, { service: "Atlas VS Code Companion", version: 1, status: "online" });
    }

    if (!isAuthorized(request.headers.authorization, getToken())) {
      return sendJson(response, 401, { error: "Pair Atlas with VS Code using the token shown in Atlas Settings." });
    }

    if (request.method === "GET" && url.pathname === "/v1/session") {
      return sendJson(response, 200, { connected: true, capabilities: ["chat", "selection-context", "file-context"] });
    }

    if (request.method !== "POST" || url.pathname !== "/v1/chat") {
      return sendJson(response, 404, { error: "Companion endpoint not found." });
    }

    const now = Date.now();
    while (recentRequests.length && recentRequests[0] < now - 60_000) recentRequests.shift();
    if (recentRequests.length >= 30) return sendJson(response, 429, { error: "Too many companion requests. Wait a moment and try again." });
    if (activeChats >= MAX_CONCURRENT_CHATS) return sendJson(response, 429, { error: "Atlas is already handling the maximum number of companion requests." });
    recentRequests.push(now);

    activeChats += 1;
    try {
      const body = await readJsonBody(request);
      const input = validateChatRequest(body);
      const content = await chat(input);
      return sendJson(response, 200, { content });
    } catch (error) {
      const status = error?.statusCode === 413 || error?.statusCode === 415 ? error.statusCode : 400;
      return sendJson(response, status, { error: String(error?.message || "Companion request failed.").slice(0, 500) });
    } finally {
      activeChats -= 1;
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, COMPANION_HOST, () => {
      server.removeListener("error", reject);
      const address = server.address();
      const listeningPort = typeof address === "object" && address ? address.port : port;
      resolve({
        host: COMPANION_HOST,
        port: listeningPort,
        url: `http://${COMPANION_HOST}:${listeningPort}`,
        close: () => new Promise((closeResolve) => server.close(() => closeResolve())),
      });
    });
  });
}

function validateChatRequest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Request body is invalid.");
  const mode = value.mode === "chat" ? "chat" : "code";
  if (!Array.isArray(value.messages) || !value.messages.length || value.messages.length > 40) throw new Error("Provide between 1 and 40 messages.");
  const messages = value.messages.map((message) => {
    if (!message || !["user", "assistant"].includes(message.role)) throw new Error("Message role is invalid.");
    if (typeof message.content !== "string" || !message.content.trim() || message.content.length > 32_000) throw new Error("Message content is invalid or too long.");
    return { role: message.role, content: message.content.trim() };
  });
  if (messages.reduce((total, message) => total + message.content.length, 0) > 120_000) throw new Error("Conversation context is too large.");
  return { mode, messages };
}

function isAuthorized(authorization, expectedToken) {
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ") || typeof expectedToken !== "string") return false;
  const supplied = Buffer.from(authorization.slice(7), "utf8");
  const expected = Buffer.from(expectedToken, "utf8");
  return supplied.length === expected.length && supplied.length >= 32 && timingSafeEqual(supplied, expected);
}

function readJsonBody(request) {
  if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
    const error = new Error("Content-Type must be application/json.");
    error.statusCode = 415;
    throw error;
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    request.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        const error = new Error("Companion request is too large.");
        error.statusCode = 413;
        reject(error);
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Request body must contain valid JSON."));
      }
    });
    request.on("error", reject);
  });
}

function setSecurityHeaders(response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Content-Security-Policy", "default-src 'none'");
  response.setHeader("Referrer-Policy", "no-referrer");
}

function sendJson(response, status, value) {
  if (response.writableEnded) return;
  response.statusCode = status;
  response.end(JSON.stringify(value));
}

module.exports = {
  COMPANION_HOST,
  COMPANION_PORT,
  isAuthorized,
  startCompanionServer,
  validateChatRequest,
};
