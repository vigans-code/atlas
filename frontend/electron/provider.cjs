const DEFAULT_PROVIDER = {
  provider: "atlas",
  model: "atlas-native-v1",
  chatModel: "atlas-native-v1",
  imageModel: "not-trained",
  baseUrl: "http://127.0.0.1:47636",
  reasoningEffort: "none",
};

const GENERAL_ASSISTANT_PROMPT = [
  "You are Atlas, an open-source AI assistant built and trained from random initialization by Atlas contributors.",
  "Answer directly, distinguish facts from uncertainty, and never invent sources or completed actions.",
  "Support lawful research, defensive security, programming, writing, education, and normal productivity.",
  "Refuse only clearly harmful actions such as unauthorized access, credential theft, malware deployment, stalking, or doxxing, and offer a safe alternative.",
].join(" ");

const CODE_AGENT_PROMPT = [
  "You are Atlas Code Agent, an Atlas-owned software assistant.",
  "Write, explain, debug, refactor, and review code directly.",
  "Do not claim a file changed or command ran without a verified tool result.",
  "Require confirmation before destructive actions and preserve user data.",
].join(" ");

function validateProviderConfig(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Atlas Native settings are invalid.");
  }
  if (value.provider !== "atlas") throw new Error("Atlas only supports Atlas Native AI.");
  const model = cleanText(value.model || DEFAULT_PROVIDER.model, "Model", 120);
  const chatModel = cleanText(value.chatModel || model, "Chat model", 120);
  const baseUrl = normalizeAtlasUrl(value.baseUrl || DEFAULT_PROVIDER.baseUrl);
  return {
    provider: "atlas",
    model,
    chatModel,
    imageModel: "not-trained",
    baseUrl,
    reasoningEffort: "none",
  };
}

function resolveStoredProviderConfig(value) {
  return validateProviderConfig(value);
}

function normalizeAtlasUrl(value) {
  const raw = cleanText(value, "Base URL", 500).replace(/\/+$/, "");
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Atlas Native URL is invalid.");
  }
  const loopback = ["127.0.0.1", "localhost", "::1", "[::1]"].includes(parsed.hostname);
  if (parsed.protocol !== "http:" || !loopback || parsed.username || parsed.password) {
    throw new Error("Atlas Native must use an unauthenticated local loopback address.");
  }
  return parsed.toString().replace(/\/+$/, "");
}

function sanitizeMessages(value) {
  if (!Array.isArray(value) || !value.length) throw new Error("At least one message is required.");
  const messages = value.slice(-20).map((message) => {
    if (!message || !["user", "assistant"].includes(message.role)) {
      throw new Error("Message role is invalid.");
    }
    return { role: message.role, content: cleanText(message.content, "Message", 32_000) };
  });
  const total = messages.reduce((sum, message) => sum + message.content.length, 0);
  if (total > 80_000) throw new Error("Conversation context is too large. Start a new conversation.");
  return messages;
}

async function runProviderChat({ config, mode, messages, attachmentText = "", signal }) {
  const safeConfig = validateProviderConfig(config);
  const safeMessages = sanitizeMessages(messages);
  const lastMessage = safeMessages.at(-1).content;
  const quickReply = mode === "chat"
    ? identityQuickReply(lastMessage)
      ?? albanianQuickReply(lastMessage)
      ?? conversationQuickReply(lastMessage)
    : null;
  if (quickReply) return quickReply;

  const augmented = attachmentText
    ? [
        ...safeMessages.slice(0, -1),
        { ...safeMessages.at(-1), content: `${lastMessage}\n\nUser-selected file context:\n${attachmentText}` },
      ]
    : safeMessages;
  const response = await fetchJson(`${safeConfig.baseUrl}/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // Preserve the first checkpoint's small context window for the user's
      // actual conversation. Behavioral guidance is learned during training.
      messages: augmented.slice(-12),
      max_new_tokens: mode === "code" ? 384 : 256,
      temperature: 0.2,
      top_k: 1,
    }),
    signal,
  }, 180_000);
  const text = response?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("Atlas Native returned no text.");
  return text.trim();
}

async function runProviderImage({ prompt }) {
  cleanText(prompt, "Image prompt", 4_000);
  throw new Error("Atlas Native does not have a trained image model yet.");
}

async function testProvider({ config }) {
  const safeConfig = validateProviderConfig(config);
  const health = await fetchJson(`${safeConfig.baseUrl}/v1/health`, { method: "GET" }, 10_000);
  if (health?.status !== "ready") throw new Error("Atlas Native needs a trained checkpoint.");
  return { ok: true, message: "Atlas Native is ready." };
}

function conversationQuickReply(message) {
  const normalized = String(message).trim().toLocaleLowerCase("en-US").replace(/[!?.]+$/g, "");
  if (/^(?:hey|hi|hello|yo|hiya|good morning|good afternoon|good evening)$/.test(normalized)) {
    return "Hey! What can I help you with?";
  }
  if (/^(?:how are you|how are you doing|what'?s up|sup)$/.test(normalized)) {
    return "I'm ready to help. What's on your mind?";
  }
  return null;
}

function identityQuickReply(message) {
  const normalized = String(message).trim().toLocaleLowerCase("en-US").replace(/[?!.,]+$/g, "");
  if (/^(?:who|what) are you$/.test(normalized) || /who (?:made|built|created) (?:you|atlas)/.test(normalized)) {
    return "I'm Atlas, an open-source AI assistant whose tokenizer, architecture, training pipeline, and model weights are built by Atlas contributors from random initialization.";
  }
  return null;
}

function albanianQuickReply(message) {
  const normalized = String(message).trim().toLocaleLowerCase("sq-AL").replace(/[!?.]+$/g, "");
  if (/^(?:përshëndetje|pershendetje|tung|tungjatjeta)$/.test(normalized)) {
    return "Përshëndetje! Si mund të të ndihmoj?";
  }
  if (/^(?:si je|si jeni)$/.test(normalized)) return "Jam gati të të ndihmoj. Çfarë ke në mendje?";
  return null;
}

function responseLanguageInstruction(messages) {
  return shouldReplyInAlbanian(messages)
    ? "Reply in clear standard Albanian."
    : "English is the default response language unless the user requests another language.";
}

function shouldReplyInAlbanian(messages) {
  const latest = messages.at(-1)?.content?.toLocaleLowerCase("sq-AL") ?? "";
  if (/\b(?:english|anglisht)\b/.test(latest)) return false;
  return /\b(?:shqip|përshëndetje|pershendetje|çfarë|cfare|është|eshte|faleminderit|hajde|si je)\b/.test(latest);
}

function isFalseCodeCapabilityRefusal(text) {
  if (typeof text !== "string") return false;
  const normalized = text.toLocaleLowerCase("en-US").replace(/[‘’]/g, "'");
  return /\b(?:i|atlas)\b[^.\n]{0,50}\b(?:cannot|can't|unable to)\s+(?:write|generate|create|produce)\s+(?:code|software|programs?)\b/.test(normalized)
    && !/credential|malware|unauthorized|execute|run/.test(normalized);
}

async function fetchJson(url, options, timeoutMs = 180_000, maxBytes = 2 * 1024 * 1024) {
  let response;
  try {
    response = await fetch(url, { ...options, signal: combinedSignal(options?.signal, timeoutMs), redirect: "error" });
  } catch (error) {
    if (options?.signal?.aborted || error?.name === "AbortError") throw new Error("Generation stopped.");
    if (error?.name === "TimeoutError") throw new Error("Atlas Native timed out.");
    throw new Error(`Could not reach Atlas Native: ${error?.message ?? "network error"}`);
  }
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > maxBytes) throw new Error("Atlas Native returned too much data.");
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) throw new Error("Atlas Native returned too much data.");
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("Atlas Native returned invalid JSON.");
  }
  if (!response.ok) {
    const detail = typeof body?.detail === "string" ? body.detail : `Atlas Native failed with status ${response.status}.`;
    throw new Error(detail.slice(0, 500));
  }
  return body;
}

function combinedSignal(signal, timeoutMs) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function cleanText(value, label, maxLength) {
  if (typeof value !== "string") throw new Error(`${label} is required.`);
  if (value.length > maxLength) throw new Error(`${label} is too long.`);
  return value.trim();
}

module.exports = {
  CODE_AGENT_PROMPT,
  DEFAULT_PROVIDER,
  GENERAL_ASSISTANT_PROMPT,
  albanianQuickReply,
  conversationQuickReply,
  identityQuickReply,
  isFalseCodeCapabilityRefusal,
  normalizeAtlasUrl,
  resolveStoredProviderConfig,
  responseLanguageInstruction,
  runProviderChat,
  runProviderImage,
  sanitizeMessages,
  shouldReplyInAlbanian,
  testProvider,
  validateProviderConfig,
};
