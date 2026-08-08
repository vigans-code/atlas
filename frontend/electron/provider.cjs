const DEFAULT_PROVIDER = {
  provider: "atlas",
  model: "atlas-native-v0",
  chatModel: "atlas-native-v0",
  imageModel: "not-supported",
  baseUrl: "http://127.0.0.1:47636",
  reasoningEffort: "none",
};

const PROVIDERS = new Set(["atlas", "demo", "openai", "compatible", "ollama"]);
const REASONING_EFFORTS = new Set(["none", "low", "medium", "high"]);
const GENERAL_ASSISTANT_PROMPT = [
  "You are Atlas, the open-source local AI desktop assistant in this application.",
  "Never claim that Atlas was created, trained, or owned by Anthropic, OpenAI, Google, Meta, or another model vendor. The underlying language model is a replaceable component configured by the user and does not define Atlas's identity. If asked about your identity or creator, identify yourself as Atlas and explain that this open-source project is built by Atlas contributors and runs through the user's configured provider.",
  "Atlas is designed to assist with lawful open-source intelligence (OSINT), research, journalism, defensive security, education, and ordinary productivity. Help with legitimate requests involving public usernames, public profiles, email or domain research, DNS, WHOIS, certificate transparency, IP information, website technologies, public company information, source evaluation, metadata from user-provided files, investigation organization, and reporting.",
  "Do not refuse merely because a request mentions OSINT, cybersecurity, an email address, a username, a domain, an IP address, or another dual-use topic. When intent is ambiguous, answer the safe, lawful interpretation and clearly state any relevant limits. Refuse only the part that clearly requests wrongdoing such as unauthorized access, credential theft, malware deployment, stalking, doxxing private personal data, or bypassing security controls; then offer a useful lawful alternative.",
  "Fulfill ordinary requests for essays, documents, rewriting, brainstorming, explanations, and plans. You can draft written content and must never falsely claim that an AI cannot write or create documents. When asked to write an essay or document, provide the finished prose at the requested length; do not substitute an outline, disclaimer, or follow-up question unless the user explicitly asks for one.",
  "Infer a sensible scope when wording is informal, follow the user's actual request, answer directly, and distinguish facts from uncertainty. Avoid generic phrases such as 'I can't help with that' when any safe and useful portion can be answered.",
].join(" ");

const CODE_AGENT_PROMPT = [
  "You are Atlas Code Agent, a practical software-engineering assistant.",
  "You can write and generate code, complete source files, debug errors, explain programs, review changes, design architecture, and provide implementation steps across common programming languages and frameworks.",
  "Never claim that you cannot write code or create software merely because you are an AI language model. If asked what you can code, answer with concrete languages and tasks you support. If asked to build something, provide useful code or an actionable implementation immediately.",
  "You may explain that you cannot directly execute commands or edit local files when tool access is unavailable, but that limitation must never prevent you from writing the requested code in your response.",
  "Be direct and useful. State assumptions when needed, preserve user data, never claim that a command ran or a file changed unless a tool result proves it, and request confirmation before destructive actions.",
].join(" ");

function validateProviderConfig(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Provider settings are invalid.");
  const provider = PROVIDERS.has(value.provider) ? value.provider : null;
  if (!provider) throw new Error("Choose a supported provider.");
  const model = cleanText(value.model, "Model", 120);
  const chatModel = cleanText(value.chatModel || value.model, "Chat model", 120);
  const imageModel = cleanText(value.imageModel || "gpt-image-2", "Image model", 120);
  const reasoningEffort = REASONING_EFFORTS.has(value.reasoningEffort) ? value.reasoningEffort : "low";
  let baseUrl = "";
  if (provider === "atlas") baseUrl = normalizeAtlasUrl(value.baseUrl || DEFAULT_PROVIDER.baseUrl);
  if (provider === "openai") baseUrl = "https://api.openai.com/v1";
  if (provider === "ollama") baseUrl = normalizeProviderUrl(value.baseUrl || "http://127.0.0.1:11434", true);
  if (provider === "compatible") baseUrl = normalizeProviderUrl(value.baseUrl, true);
  return { provider, model, chatModel, imageModel, baseUrl, reasoningEffort };
}

function normalizeAtlasUrl(value) {
  const normalized = normalizeProviderUrl(value, true);
  const parsed = new URL(normalized);
  const loopback = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost" || parsed.hostname === "::1" || parsed.hostname === "[::1]";
  if (parsed.protocol !== "http:" || !loopback) throw new Error("Atlas Native must use a local loopback address.");
  return normalized;
}

function normalizeProviderUrl(value, allowLoopbackHttp) {
  const raw = cleanText(value, "Base URL", 500).replace(/\/+$/, "");
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Provider URL is invalid.");
  }
  if (parsed.username || parsed.password) throw new Error("Provider URLs cannot contain credentials.");
  const loopback = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost" || parsed.hostname === "::1" || parsed.hostname === "[::1]";
  if (parsed.protocol !== "https:" && !(allowLoopbackHttp && loopback && parsed.protocol === "http:")) {
    throw new Error("Provider URLs must use HTTPS; HTTP is allowed only for localhost.");
  }
  return parsed.toString().replace(/\/+$/, "");
}

function sanitizeMessages(value) {
  if (!Array.isArray(value) || !value.length) throw new Error("At least one message is required.");
  const messages = value.slice(-40).map((message) => {
    if (!message || !["user", "assistant"].includes(message.role)) throw new Error("Message role is invalid.");
    return { role: message.role, content: cleanText(message.content, "Message", 32_000) };
  });
  const total = messages.reduce((sum, message) => sum + message.content.length, 0);
  if (total > 120_000) throw new Error("Conversation context is too large. Start a new conversation.");
  return messages;
}

async function runProviderChat({ config, apiKey, mode, messages, attachmentText = "", installationId = "", onChunk, signal }) {
  const safeConfig = validateProviderConfig(config);
  const safeMessages = sanitizeMessages(messages);
  const useAlbanian = mode === "chat" && shouldReplyInAlbanian(safeMessages);
  const selectedModel = useAlbanian && safeConfig.provider === "ollama" ? "gemma3:4b" : mode === "chat" ? safeConfig.chatModel : safeConfig.model;
  const languageInstruction = responseLanguageInstruction(safeMessages);
  const systemPrompt = mode === "code"
    ? CODE_AGENT_PROMPT
    : `${GENERAL_ASSISTANT_PROMPT} ${languageInstruction}`;
  const augmented = attachmentText
    ? [...safeMessages.slice(0, -1), { ...safeMessages.at(-1), content: `${safeMessages.at(-1).content}\n\nUser-selected file context:\n${attachmentText}` }]
    : safeMessages;

  const quickReply = mode === "chat" ? identityQuickReply(augmented.at(-1).content) ?? albanianQuickReply(augmented.at(-1).content) : null;
  if (quickReply) return quickReply;

  if (safeConfig.provider === "atlas") {
    const response = await fetchJson(`${safeConfig.baseUrl}/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: augmented.slice(-12), max_new_tokens: mode === "code" ? 384 : 256, temperature: 0.2, top_k: 1 }),
      signal,
    }, 120_000);
    const text = response?.content;
    if (typeof text !== "string" || !text.trim()) throw new Error("Atlas Native returned no text.");
    return text.trim();
  }
  if (safeConfig.provider === "demo") return demoChat(augmented.at(-1).content, mode);
  if (safeConfig.provider === "openai") {
    requireApiKey(apiKey);
    const body = {
      model: selectedModel,
      instructions: systemPrompt,
      input: augmented,
      store: false,
      reasoning: { effort: safeConfig.reasoningEffort },
      text: { verbosity: "medium" },
      max_output_tokens: 4096,
    };
    if (installationId) body.safety_identifier = installationId;
    const response = await fetchJson(`${safeConfig.baseUrl}/responses`, {
      method: "POST",
      headers: providerHeaders(apiKey),
      body: JSON.stringify(body),
      signal,
    });
    return extractResponsesText(response);
  }
  if (safeConfig.provider === "compatible") {
    const response = await fetchJson(`${safeConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: providerHeaders(apiKey),
      body: JSON.stringify({ model: selectedModel, messages: [{ role: "system", content: systemPrompt }, ...augmented], stream: false }),
      signal,
    });
    const text = response?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) throw new Error("The provider returned no text.");
    return text.trim();
  }
  const ollamaConfig = { ...safeConfig, model: selectedModel };
  const firstResponse = await runOllamaChat({ config: ollamaConfig, mode, systemPrompt, messages: augmented, onChunk, signal });
  if (mode !== "code" || !isFalseCodeCapabilityRefusal(firstResponse)) return firstResponse;

  const retryPrompt = `${systemPrompt} A previous draft incorrectly claimed that Atlas could not write code. Disregard that draft and answer the user's original coding request with concrete, useful assistance. Do not mention the discarded draft.`;
  return runOllamaChat({ config: ollamaConfig, mode, systemPrompt: retryPrompt, messages: augmented, onChunk, signal });
}

function isFalseCodeCapabilityRefusal(text) {
  if (typeof text !== "string") return false;
  const normalized = text.toLocaleLowerCase("en-US").replace(/[\u2018\u2019]/g, "'");
  const directRefusal = /\b(?:i|atlas)\b[^.\n]{0,50}\b(?:cannot|can't|unable to)\s+(?:write|generate|create|produce)\s+(?:code|software|programs?)\b/;
  const deniedAbility = /\b(?:i|atlas)\b[^.\n]{0,80}\b(?:do not|don't|does not|doesn't|lack|lacks)\b[^.\n]{0,60}\b(?:ability|capability)\b[^.\n]{0,60}\b(?:write|generate|create|produce)\b[^.\n]{0,30}\b(?:code|software|programs?)\b/;
  return directRefusal.test(normalized) || deniedAbility.test(normalized);
}

function responseLanguageInstruction(messages) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  if (shouldReplyInAlbanian(messages)) {
    return "Reply in natural standard Albanian (Shqip) for this response. Understand Albanian vocabulary correctly: 'hajde' means 'come on/let's go', while 'mirupafshim' means 'goodbye'. Do not translate the response into English unless asked.";
  }
  return "English is the default response language. Switch languages only when the user's latest message clearly uses another language or explicitly requests it.";
}

function shouldReplyInAlbanian(messages) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const normalized = latestUserMessage.toLocaleLowerCase("sq-AL");
  const words = normalized.split(/[^\p{L}]+/u).filter(Boolean);
  const albanianWords = new Set([
    "hajde", "shqip", "shqiptar", "shqiptare", "faleminderit", "përshëndetje", "pershendetje",
    "mirupafshim", "çfarë", "cfare", "është", "eshte", "mirë", "mire", "dua", "flas", "fol",
  ]);
  return /\b(?:albanian|shqip)\b/i.test(latestUserMessage) || words.some((word) => albanianWords.has(word));
}

function albanianQuickReply(message) {
  const normalized = message.toLocaleLowerCase("sq-AL").replace(/[^\p{L}\s]/gu, " ").replace(/\s+/g, " ").trim();
  if (/^(?:no i said )?hajde(?: fol shqip)?$/.test(normalized)) return "Hajde! Mund të flasim shqip. Si mund të të ndihmoj?";
  if (/^(?:hajde )?(?:fol|flisni) shqip$/.test(normalized)) return "Patjetër! Mund të flasim shqip. Si mund të të ndihmoj?";
  if (/^(?:hajde )?si je$/.test(normalized)) return "Jam mirë, faleminderit! Po ti, si je?";
  if (/^(?:përshëndetje|pershendetje|tung|tungjatjeta)$/.test(normalized)) return "Përshëndetje! Si mund të të ndihmoj?";
  if (/^faleminderit(?: shumë| shume)?$/.test(normalized)) return "S’ka përse! Jam këtu nëse të duhet diçka tjetër.";
  if (/\bhow about albanian\b/.test(normalized)) return "Po, mund të flas shqip. Si mund të të ndihmoj?";
  return null;
}

function identityQuickReply(message) {
  const normalized = message.toLocaleLowerCase("en-US").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  const asksWhoBuilt = /\bwho\b.*\b(?:made|created|built|developed|trained|owns?)\b.*\b(?:you|atlas)\b/.test(normalized);
  const asksWhoBuiltReversed = /\bwho\b.*\b(?:you|atlas)\b.*\b(?:made|created|built|developed|trained|owns?)\b/.test(normalized);
  const asksVendor = /\b(?:are you|is atlas|were you|was atlas)\b.*\b(?:anthropic|openai|chatgpt|claude|google|gemini)\b/.test(normalized);
  const asksIdentity = /^(?:who|what) are you$/.test(normalized);
  if (!asksWhoBuilt && !asksWhoBuiltReversed && !asksVendor && !asksIdentity) return null;
  return "I’m Atlas, an open-source local AI desktop assistant. Atlas is built by its project contributors and runs through the AI provider configured on this device. I’m not ChatGPT or Claude, and Atlas was not created by OpenAI or Anthropic.";
}

async function runOllamaChat({ config, mode, systemPrompt, messages, onChunk, signal }) {
  let response;
  try {
    response = await fetch(`${config.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "system", content: systemPrompt }, ...messages.slice(-12)],
        stream: true,
        think: false,
        keep_alive: "60m",
        options: {
          num_ctx: mode === "code" ? 4096 : 2048,
          num_predict: mode === "code" ? 768 : 1024,
          temperature: 0.35,
        },
      }),
      signal: combinedSignal(signal, 120_000),
      redirect: "error",
    });
  } catch (error) {
    if (signal?.aborted || error?.name === "AbortError") throw new Error("Generation stopped.");
    if (error?.name === "TimeoutError") throw new Error("Local Atlas AI timed out.");
    throw new Error(`Could not reach Local Atlas AI: ${error?.message ?? "network error"}`);
  }
  if (!response.ok || !response.body) throw new Error(`Local Atlas AI failed with status ${response.status}.`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let responseBytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      responseBytes += value.byteLength;
      if (responseBytes > 2 * 1024 * 1024) throw new Error("Local Atlas AI returned too much data.");
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const chunk = parseOllamaChatLine(line);
        if (chunk) {
          text += chunk;
          if (typeof onChunk === "function") onChunk(chunk);
        }
      }
    }
  } catch (error) {
    if (signal?.aborted || error?.name === "AbortError") throw new Error("Generation stopped.");
    throw error;
  }
  if (buffer.trim()) {
    const chunk = parseOllamaChatLine(buffer);
    if (chunk) {
      text += chunk;
      if (typeof onChunk === "function") onChunk(chunk);
    }
  }
  if (!text.trim()) throw new Error("Local Atlas AI returned no text.");
  return text.trim();
}

function parseOllamaChatLine(line) {
  if (!line.trim()) return "";
  let update;
  try {
    update = JSON.parse(line);
  } catch {
    return "";
  }
  if (update?.error) throw new Error(String(update.error).slice(0, 500));
  return typeof update?.message?.content === "string" ? update.message.content : "";
}

async function runProviderImage({ config, apiKey, prompt }) {
  const safeConfig = validateProviderConfig(config);
  const safePrompt = cleanText(prompt, "Image prompt", 4_000);
  if (safeConfig.provider === "atlas") throw new Error("Atlas Native image training has not started yet.");
  if (safeConfig.provider === "demo") return demoImage(safePrompt);
  if (safeConfig.provider === "ollama") throw new Error("The configured Ollama provider does not expose image generation through Atlas.");
  if (safeConfig.provider === "openai") requireApiKey(apiKey);
  const response = await fetchJson(`${safeConfig.baseUrl}/images/generations`, {
    method: "POST",
    headers: providerHeaders(apiKey),
    body: JSON.stringify({ model: safeConfig.imageModel, prompt: safePrompt, size: "1024x1024", quality: "low", n: 1 }),
  }, 180_000, 30 * 1024 * 1024);
  const image = response?.data?.[0];
  if (typeof image?.b64_json === "string" && image.b64_json.length) return { dataUrl: `data:image/png;base64,${image.b64_json}`, revisedPrompt: image.revised_prompt ?? null };
  if (typeof image?.url === "string") return { dataUrl: await fetchImageAsDataUrl(image.url), revisedPrompt: image.revised_prompt ?? null };
  throw new Error("The image provider returned no image.");
}

async function testProvider({ config, apiKey, installationId }) {
  const safeConfig = validateProviderConfig(config);
  if (safeConfig.provider === "demo") return { ok: true, message: "Local Demo is ready." };
  const text = await runProviderChat({ config: safeConfig, apiKey, installationId, mode: "chat", messages: [{ role: "user", content: "Reply with exactly: Atlas provider ready" }] });
  return { ok: true, message: text.slice(0, 160) };
}

function extractResponsesText(response) {
  if (typeof response?.output_text === "string" && response.output_text.trim()) return response.output_text.trim();
  const pieces = [];
  for (const item of Array.isArray(response?.output) ? response.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (content?.type === "output_text" && typeof content.text === "string") pieces.push(content.text);
    }
  }
  const text = pieces.join("\n").trim();
  if (!text) throw new Error("The provider returned no text.");
  return text;
}

async function fetchJson(url, options, timeoutMs = 90_000, maxBytes = 5 * 1024 * 1024) {
  let response;
  try {
    response = await fetch(url, { ...options, signal: combinedSignal(options?.signal, timeoutMs), redirect: "error" });
  } catch (error) {
    if (options?.signal?.aborted || error?.name === "AbortError") throw new Error("Generation stopped.");
    if (error?.name === "TimeoutError") throw new Error("The provider request timed out.");
    throw new Error(`Could not reach the provider: ${error?.message ?? "network error"}`);
  }
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) throw new Error("The provider response was too large.");
  let text;
  try {
    text = await response.text();
  } catch (error) {
    if (options?.signal?.aborted || error?.name === "AbortError") throw new Error("Generation stopped.");
    throw error;
  }
  if (Buffer.byteLength(text, "utf8") > maxBytes) throw new Error("The provider response was too large.");
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("The provider returned invalid JSON.");
  }
  if (!response.ok) {
    const message = body?.error?.message || body?.message || `Provider request failed with status ${response.status}.`;
    throw new Error(String(message).slice(0, 500));
  }
  return body;
}

function combinedSignal(signal, timeoutMs) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function fetchImageAsDataUrl(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error("Image downloads must use HTTPS.");
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000), redirect: "error" });
  if (!response.ok) throw new Error("The generated image could not be downloaded.");
  const contentType = response.headers.get("content-type") || "image/png";
  if (!contentType.startsWith("image/")) throw new Error("The provider returned an invalid image type.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 25 * 1024 * 1024) throw new Error("The generated image was too large.");
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

function providerHeaders(apiKey) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

function requireApiKey(apiKey) {
  if (!apiKey) throw new Error("This provider requires an API key. Add one in Settings.");
}

function cleanText(value, label, maxLength) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  if (value.length > maxLength) throw new Error(`${label} is too long.`);
  return value.trim();
}

function demoChat(prompt, mode) {
  const clean = prompt.slice(0, 500);
  if (mode === "code") return `Local Demo received your coding task:\n\n${clean}\n\nConnect OpenAI, an OpenAI-compatible endpoint, or Ollama in Settings for a model-generated implementation. The provider pipeline and this button are working.`;
  return `Local Demo received your message:\n\n${clean}\n\nConnect a model provider in Settings for a generative response. The chat pipeline and this button are working.`;
}

function demoImage(prompt) {
  const safe = prompt.replace(/[<>&"']/g, " ").slice(0, 180);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#111827"/><stop offset="1" stop-color="#4f46e5"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/><circle cx="512" cy="420" r="180" fill="#ffffff" opacity=".08"/><text x="512" y="720" fill="#ffffff" font-family="Segoe UI, sans-serif" font-size="38" text-anchor="middle">Atlas Local Demo</text><text x="512" y="780" fill="#c7d2fe" font-family="Segoe UI, sans-serif" font-size="24" text-anchor="middle">${safe}</text></svg>`;
  return { dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, revisedPrompt: null };
}

module.exports = {
  CODE_AGENT_PROMPT,
  DEFAULT_PROVIDER,
  GENERAL_ASSISTANT_PROMPT,
  extractResponsesText,
  normalizeProviderUrl,
  normalizeAtlasUrl,
  parseOllamaChatLine,
  albanianQuickReply,
  identityQuickReply,
  isFalseCodeCapabilityRefusal,
  responseLanguageInstruction,
  shouldReplyInAlbanian,
  runProviderChat,
  runProviderImage,
  sanitizeMessages,
  testProvider,
  validateProviderConfig,
};
