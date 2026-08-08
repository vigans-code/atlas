const assert = require("node:assert/strict");
const test = require("node:test");

const { CODE_AGENT_PROMPT, DEFAULT_PROVIDER, GENERAL_ASSISTANT_PROMPT, albanianQuickReply, extractResponsesText, identityQuickReply, isFalseCodeCapabilityRefusal, normalizeAtlasUrl, normalizeProviderUrl, parseOllamaChatLine, responseLanguageInstruction, runProviderChat, runProviderImage, sanitizeMessages, shouldReplyInAlbanian, validateProviderConfig } = require("./provider.cjs");

test("validates provider settings and restricts insecure remote URLs", () => {
  assert.equal(validateProviderConfig(DEFAULT_PROVIDER).provider, "atlas");
  assert.equal(normalizeProviderUrl("http://localhost:11434/", true), "http://localhost:11434");
  assert.throws(() => normalizeProviderUrl("http://example.com/v1", true));
  assert.throws(() => normalizeProviderUrl("javascript:alert(1)", true));
  assert.throws(() => normalizeProviderUrl("https://user:pass@example.com/v1", true));
});

test("Atlas Native is restricted to the local machine", () => {
  assert.equal(normalizeAtlasUrl("http://127.0.0.1:47636/"), "http://127.0.0.1:47636");
  assert.throws(() => normalizeAtlasUrl("https://models.example.com"));
  assert.throws(() => normalizeAtlasUrl("http://192.168.1.10:47636"));
});

test("bounds and sanitizes provider messages", () => {
  assert.deepEqual(sanitizeMessages([{ role: "user", content: " hello " }]), [{ role: "user", content: "hello" }]);
  assert.throws(() => sanitizeMessages([{ role: "system", content: "unsafe" }]));
  assert.throws(() => sanitizeMessages([]));
});

test("extracts text from Responses API output", () => {
  assert.equal(extractResponsesText({ output_text: "Ready" }), "Ready");
  assert.equal(extractResponsesText({ output: [{ content: [{ type: "output_text", text: "One" }, { type: "output_text", text: "Two" }] }] }), "One\nTwo");
  assert.throws(() => extractResponsesText({ output: [] }));
});

test("extracts streamed local model tokens", () => {
  assert.equal(parseOllamaChatLine('{"message":{"content":"Atlas"},"done":false}'), "Atlas");
  assert.equal(parseOllamaChatLine('{"done":true}'), "");
  assert.throws(() => parseOllamaChatLine('{"error":"model missing"}'));
});

test("keeps English as default and recognizes Albanian requests", () => {
  assert.match(responseLanguageInstruction([{ role: "user", content: "How are you?" }]), /English is the default/);
  assert.match(responseLanguageInstruction([{ role: "user", content: "Fol shqip" }]), /standard Albanian/);
  assert.match(responseLanguageInstruction([{ role: "user", content: "hajde" }]), /come on\/let's go/);
  assert.equal(shouldReplyInAlbanian([{ role: "user", content: "Write this in English" }]), false);
  assert.equal(shouldReplyInAlbanian([{ role: "user", content: "Çfarë është kjo?" }]), true);
  assert.equal(albanianQuickReply("hajde"), "Hajde! Mund të flasim shqip. Si mund të të ndihmoj?");
  assert.equal(albanianQuickReply("si je?"), "Jam mirë, faleminderit! Po ti, si je?");
});

test("answers identity questions without model-vendor hallucinations", () => {
  assert.match(identityQuickReply("Who created you?"), /open-source local AI desktop assistant/);
  assert.match(identityQuickReply("Are you made by Anthropic?"), /not created by OpenAI or Anthropic/);
  assert.match(identityQuickReply("Who are you?"), /I’m Atlas/);
  assert.equal(identityQuickReply("Who created Linux?"), null);
});

test("allows legitimate OSINT while preserving clear safety limits", () => {
  assert.match(GENERAL_ASSISTANT_PROMPT, /lawful open-source intelligence/);
  assert.match(GENERAL_ASSISTANT_PROMPT, /Do not refuse merely because a request mentions OSINT/);
  assert.match(GENERAL_ASSISTANT_PROMPT, /unauthorized access/);
  assert.match(GENERAL_ASSISTANT_PROMPT, /offer a useful lawful alternative/);
});

test("code agent explicitly writes code and detects false capability refusals", () => {
  assert.match(CODE_AGENT_PROMPT, /can write and generate code/);
  assert.match(CODE_AGENT_PROMPT, /Never claim that you cannot write code/);
  assert.equal(isFalseCodeCapabilityRefusal("As an AI language model, I don't have the ability to write code."), true);
  assert.equal(isFalseCodeCapabilityRefusal("I cannot execute code on your computer, but here is the requested Python function."), false);
  assert.equal(isFalseCodeCapabilityRefusal("I can't help create credential-stealing software."), false);
});

test("demo provider produces chat and image results without credentials", async () => {
  const demoConfig = { provider: "demo", model: "atlas-demo", chatModel: "atlas-demo", imageModel: "atlas-demo-image", baseUrl: "", reasoningEffort: "low" };
  const chat = await runProviderChat({ config: demoConfig, mode: "chat", messages: [{ role: "user", content: "Hello" }] });
  assert.match(chat, /pipeline/);
  const image = await runProviderImage({ config: demoConfig, prompt: "A secure desktop app" });
  assert.match(image.dataUrl, /^data:image\/svg\+xml;base64,/);
});
