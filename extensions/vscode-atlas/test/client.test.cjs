const assert = require("node:assert/strict");
const test = require("node:test");

const { AtlasClient, validateBridgeUrl } = require("../lib/client.cjs");

test("bridge URL accepts loopback HTTP only", () => {
  assert.equal(validateBridgeUrl("http://127.0.0.1:47635"), "http://127.0.0.1:47635/");
  assert.equal(validateBridgeUrl("http://localhost:47635/"), "http://localhost:47635/");
  assert.throws(() => validateBridgeUrl("https://example.com"));
  assert.throws(() => validateBridgeUrl("http://192.168.1.20:47635"));
  assert.throws(() => validateBridgeUrl("http://user:pass@localhost:47635"));
});

test("client authenticates requests without exposing the token in the URL", async () => {
  const token = "a".repeat(43);
  let observed;
  const fakeFetch = async (url, options) => {
    observed = { url: String(url), options };
    return new Response(JSON.stringify({ connected: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const client = new AtlasClient("http://127.0.0.1:47635", token, fakeFetch);
  await client.checkConnection();
  assert.equal(observed.options.headers.Authorization, `Bearer ${token}`);
  assert.equal(observed.url.includes(token), false);
});
