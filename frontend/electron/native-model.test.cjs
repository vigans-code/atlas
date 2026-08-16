const assert = require("node:assert/strict");
const test = require("node:test");

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

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

test("packaged runtime is preferred over a development environment", (context) => {
  const resourcesPath = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-native-test-"));
  context.after(() => fs.rmSync(resourcesPath, { recursive: true, force: true }));
  const runtime = path.join(resourcesPath, "model", "runtime", "atlas-model.exe");
  const checkpoint = path.join(resourcesPath, "model", "checkpoints", "atlas-v0.pt");
  fs.mkdirSync(path.dirname(runtime), { recursive: true });
  fs.mkdirSync(path.dirname(checkpoint), { recursive: true });
  fs.writeFileSync(runtime, "test");
  fs.writeFileSync(checkpoint, "test");

  assert.deepEqual(findNativeModelRuntime({ resourcesPath, environment: {} }), {
    kind: "bundle",
    root: path.join(resourcesPath, "model"),
    executable: runtime,
    checkpoint,
  });
});
