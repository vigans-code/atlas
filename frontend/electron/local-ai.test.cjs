const test = require("node:test");
const assert = require("node:assert/strict");

const { recommendLocalModel, validateLocalModelName } = require("./local-ai.cjs");

test("recommends bounded local models from available memory", () => {
  assert.equal(recommendLocalModel(4 * 1024 ** 3).name, "qwen2.5-coder:0.5b");
  assert.equal(recommendLocalModel(8 * 1024 ** 3).name, "qwen2.5-coder:1.5b");
  assert.equal(recommendLocalModel(16 * 1024 ** 3).name, "qwen2.5-coder:3b");
  assert.equal(recommendLocalModel(32 * 1024 ** 3).name, "qwen2.5-coder:7b");
});

test("accepts model identifiers without allowing command arguments", () => {
  assert.equal(validateLocalModelName("qwen2.5-coder:1.5b"), "qwen2.5-coder:1.5b");
  assert.throws(() => validateLocalModelName("--delete everything"));
  assert.throws(() => validateLocalModelName("model && calc.exe"));
  assert.throws(() => validateLocalModelName("http://example.com/model"));
});
