const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const NATIVE_HOST = "127.0.0.1";
const NATIVE_PORT = 47636;
const NATIVE_URL = `http://${NATIVE_HOST}:${NATIVE_PORT}`;

function candidateModelRoots({ electronDirectory = __dirname, resourcesPath = process.resourcesPath, environment = process.env } = {}) {
  const roots = [];
  if (environment.ATLAS_MODEL_PROJECT_DIR) roots.push(path.resolve(environment.ATLAS_MODEL_PROJECT_DIR));
  roots.push(path.resolve(electronDirectory, "..", "..", "model"));
  if (resourcesPath) roots.push(path.resolve(resourcesPath, "..", "..", "..", "..", "model"));
  return [...new Set(roots)];
}

function findNativeModelRuntime(options = {}) {
  for (const root of candidateModelRoots(options)) {
    const python = process.platform === "win32"
      ? path.join(root, ".venv", "Scripts", "python.exe")
      : path.join(root, ".venv", "bin", "python");
    const checkpoint = path.join(root, "checkpoints", "atlas-v0.pt");
    if (fs.existsSync(python) && fs.existsSync(checkpoint)) return { root, python, checkpoint };
  }
  return null;
}

async function startNativeModel(options = {}) {
  const runtime = findNativeModelRuntime(options);
  if (!runtime) {
    return {
      process: null,
      error: "Atlas Native runtime is not installed. Create model/.venv and train model/checkpoints/atlas-v0.pt.",
    };
  }
  if (await isNativeModelReady()) return { process: null, error: null };

  const child = spawn(
    runtime.python,
    ["-m", "uvicorn", "atlas_model.server:app", "--host", NATIVE_HOST, "--port", String(NATIVE_PORT)],
    {
      cwd: runtime.root,
      env: { ...process.env, ATLAS_MODEL_CHECKPOINT: runtime.checkpoint, PYTHONUNBUFFERED: "1" },
      windowsHide: true,
      shell: false,
      stdio: "ignore",
    },
  );
  child.unref();
  const ready = await waitForNativeModel(child, 30_000);
  if (!ready) {
    if (!child.killed) child.kill();
    return { process: null, error: "Atlas Native could not start. Check the model checkpoint and runtime." };
  }
  return { process: child, error: null };
}

async function waitForNativeModel(child, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && child.exitCode === null) {
    if (await isNativeModelReady()) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function isNativeModelReady() {
  try {
    const response = await fetch(`${NATIVE_URL}/v1/health`, { signal: AbortSignal.timeout(1_000) });
    if (!response.ok) return false;
    const body = await response.json();
    return body?.status === "ready";
  } catch {
    return false;
  }
}

function stopNativeModel(child) {
  if (child && child.exitCode === null && !child.killed) child.kill();
}

module.exports = {
  NATIVE_URL,
  candidateModelRoots,
  findNativeModelRuntime,
  isNativeModelReady,
  startNativeModel,
  stopNativeModel,
};
