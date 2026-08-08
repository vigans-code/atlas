const assert = require("node:assert/strict");
const test = require("node:test");

const { buildEditorPrompt, extractFirstCodeBlock } = require("../lib/context.cjs");

test("editor context is labeled, bounded, and fenced", () => {
  const prompt = buildEditorPrompt({ instruction: "Review this", code: "const ok = true;", language: "javascript", fileName: "src/app.js" });
  assert.match(prompt, /Review this/);
  assert.match(prompt, /src\/app\.js/);
  assert.match(prompt, /```javascript/);
  assert.ok(prompt.length < 33_000);
});

test("extracts a generated code block for safe preview", () => {
  assert.equal(extractFirstCodeBlock("Use this:\n```js\nconst value = 1;\n```"), "const value = 1;");
  assert.equal(extractFirstCodeBlock("plain response"), "plain response");
});
