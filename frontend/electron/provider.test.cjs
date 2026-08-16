const assert = require("node:assert/strict");
const test = require("node:test");

const {
  CODE_AGENT_PROMPT,
  DEFAULT_PROVIDER,
  GENERAL_ASSISTANT_PROMPT,
  albanianQuickReply,
  conversationQuickReply,
  identityQuickReply,
  isFalseCodeCapabilityRefusal,
  normalizeAtlasUrl,
  resolveStoredProviderConfig,
  runProviderChat,
  runProviderImage,
  sanitizeMessages,
  validateProviderConfig,
} = require("./provider.cjs");

test("Atlas Native is the only accepted provider and stays on loopback", () => {
  assert.equal(validateProviderConfig(DEFAULT_PROVIDER).provider, "atlas");
  assert.equal(normalizeAtlasUrl("http://127.0.0.1:47636/"), "http://127.0.0.1:47636");
  assert.throws(() => validateProviderConfig({ ...DEFAULT_PROVIDER, provider: "ollama" }));
  assert.throws(() => validateProviderConfig({ ...DEFAULT_PROVIDER, provider: "openai" }));
  assert.throws(() => normalizeAtlasUrl("https://models.example.com"));
  assert.throws(() => normalizeAtlasUrl("http://192.168.1.10:47636"));
});

test("old third-party settings cannot remain active", () => {
  assert.throws(() => resolveStoredProviderConfig({ provider: "ollama" }));
});

test("bounds and sanitizes provider messages", () => {
  assert.deepEqual(sanitizeMessages([{ role: "user", content: " hello " }]), [{ role: "user", content: "hello" }]);
  assert.throws(() => sanitizeMessages([{ role: "system", content: "unsafe" }]));
  assert.throws(() => sanitizeMessages([]));
});

test("keeps instant Atlas-owned conversational responses", async () => {
  assert.equal(conversationQuickReply("hey"), "Hey! What can I help you with?");
  assert.equal(albanianQuickReply("përshëndetje"), "Përshëndetje! Si mund të të ndihmoj?");
  assert.match(identityQuickReply("who created you"), /random initialization/);
  const response = await runProviderChat({ config: DEFAULT_PROVIDER, mode: "chat", messages: [{ role: "user", content: "hello" }] });
  assert.equal(response, "Hey! What can I help you with?");
});

test("native image generation is honest until an image model is trained", async () => {
  await assert.rejects(() => runProviderImage({ prompt: "A car" }), /does not have a trained image model/);
});

test("prompts preserve lawful assistance and code capability", () => {
  assert.match(GENERAL_ASSISTANT_PROMPT, /lawful research/);
  assert.match(GENERAL_ASSISTANT_PROMPT, /unauthorized access/);
  assert.match(CODE_AGENT_PROMPT, /Write, explain, debug/);
  assert.equal(isFalseCodeCapabilityRefusal("I cannot write code because I am an AI."), true);
  assert.equal(isFalseCodeCapabilityRefusal("I cannot execute code, but here is the function."), false);
});
