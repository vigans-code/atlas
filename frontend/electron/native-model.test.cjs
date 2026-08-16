const assert = require("node:assert/strict");
const test = require("node:test");

const { candidateModelRoots, findNativeModelRuntime } = require("./native-model.cjs");

test("explicit Atlas model root is considered first", () => {
  const roots = candidateModelRoots({
    electronDirectory: "C:\\repo\\frontend\\electron",
    resourcesPath: "C:\\repo\\frontend\\release\\win-unpacked\\resources",
    environment: { ATLAS_MODEL_PROJECT_DIR: "C:\\atlas-model" },
  });
  assert.equal(roots[0], "C:\\atlas-model");
});

test("missing native runtime is reported without falling back to another model", () => {
  assert.equal(findNativeModelRuntime({
    electronDirectory: "C:\\definitely-missing\\electron",
    resourcesPath: "C:\\also-missing\\resources",
    environment: {},
  }), null);
});
