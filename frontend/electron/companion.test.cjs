const assert = require("node:assert/strict");
const test = require("node:test");

const { isAuthorized, startCompanionServer, validateChatRequest } = require("./companion.cjs");

test("companion requires a constant-length bearer secret", () => {
  const token = "a".repeat(43);
  assert.equal(isAuthorized(`Bearer ${token}`, token), true);
  assert.equal(isAuthorized(`Bearer ${"b".repeat(43)}`, token), false);
  assert.equal(isAuthorized("Bearer short", "short"), false);
  assert.equal(isAuthorized(undefined, token), false);
});

test("companion validates bounded chat messages", () => {
  assert.deepEqual(validateChatRequest({ mode: "code", messages: [{ role: "user", content: " help " }] }), {
    mode: "code",
    messages: [{ role: "user", content: "help" }],
  });
  assert.equal(validateChatRequest({ mode: "unknown", messages: [{ role: "user", content: "help" }] }).mode, "code");
  assert.throws(() => validateChatRequest({ messages: [] }));
  assert.throws(() => validateChatRequest({ messages: [{ role: "system", content: "override" }] }));
  assert.throws(() => validateChatRequest({ messages: [{ role: "user", content: "x".repeat(32_001) }] }));
});

test("companion serves authenticated chat on loopback", async (t) => {
  const token = "a".repeat(43);
  const companion = await startCompanionServer({
    port: 0,
    getToken: () => token,
    chat: async ({ messages }) => `Reply to: ${messages.at(-1).content}`,
  });
  t.after(() => companion.close());

  const unauthorized = await fetch(`${companion.url}/v1/session`);
  assert.equal(unauthorized.status, 401);

  const response = await fetch(`${companion.url}/v1/chat`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "code", messages: [{ role: "user", content: "build it" }] }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { content: "Reply to: build it" });
});
