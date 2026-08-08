const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const OLLAMA_DOWNLOAD_URL = "https://ollama.com/download/windows";

const MODEL_CATALOG = [
  { name: "qwen2.5-coder:0.5b", label: "Atlas AI Tiny", minimumRamGb: 4, downloadBytes: 398_000_000 },
  { name: "qwen2.5-coder:1.5b", label: "Atlas AI Small", minimumRamGb: 7, downloadBytes: 986_000_000 },
  { name: "qwen2.5-coder:3b", label: "Atlas AI Medium", minimumRamGb: 12, downloadBytes: 1_900_000_000 },
  { name: "qwen2.5-coder:7b", label: "Atlas AI Large", minimumRamGb: 20, downloadBytes: 4_700_000_000 },
];

function recommendLocalModel(totalMemoryBytes = os.totalmem()) {
  const ramGb = totalMemoryBytes / 1024 ** 3;
  return [...MODEL_CATALOG].reverse().find((model) => ramGb >= model.minimumRamGb) || MODEL_CATALOG[0];
}

function validateLocalModelName(value) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,100}(?::[a-zA-Z0-9][a-zA-Z0-9._-]{0,60})?$/.test(value)) {
    throw new Error("The local model name is invalid.");
  }
  return value;
}

async function findOllamaExecutable(environment = process.env, platform = process.platform) {
  if (platform !== "win32") return "ollama";
  const candidates = [
    environment.LOCALAPPDATA && path.join(environment.LOCALAPPDATA, "Programs", "Ollama", "ollama.exe"),
    environment.ProgramFiles && path.join(environment.ProgramFiles, "Ollama", "ollama.exe"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Continue through the fixed, trusted install locations.
    }
  }
  return null;
}

async function getLocalAiStatus() {
  const recommended = recommendLocalModel();
  const executable = await findOllamaExecutable();
  const base = {
    runtimeInstalled: Boolean(executable),
    runtimeRunning: false,
    ramGb: Math.round((os.totalmem() / 1024 ** 3) * 10) / 10,
    recommended,
    models: [],
  };
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(3_000),
      redirect: "error",
    });
    if (!response.ok) return base;
    const body = await response.json();
    const models = (Array.isArray(body?.models) ? body.models : []).slice(0, 100).flatMap((model) => {
      if (!model || typeof model.name !== "string") return [];
      return [{ name: model.name.slice(0, 164), size: Number(model.size) || 0 }];
    });
    return { ...base, runtimeInstalled: true, runtimeRunning: true, models };
  } catch {
    return base;
  }
}

async function startOllama() {
  const executable = await findOllamaExecutable();
  if (!executable) throw new Error("Ollama is not installed yet.");
  const child = spawn(executable, ["serve"], { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
  for (let attempt = 0; attempt < 15; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const status = await getLocalAiStatus();
    if (status.runtimeRunning) return status;
  }
  throw new Error("Ollama was started but its local service did not become ready.");
}

async function pullLocalModel(modelName, onProgress, signal) {
  const model = validateLocalModelName(modelName);
  let response;
  try {
    response = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, stream: true }),
      signal,
      redirect: "error",
    });
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Model download cancelled.");
    throw new Error("Could not reach Local Atlas AI. Start Ollama and try again.");
  }
  if (!response.ok || !response.body) throw new Error(`Ollama could not download the model (status ${response.status}).`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let receivedBytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    receivedBytes += value.byteLength;
    if (receivedBytes > 20 * 1024 * 1024) throw new Error("Ollama returned too much progress data.");
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) emitProgressLine(line, onProgress);
  }
  if (buffer.trim()) emitProgressLine(buffer, onProgress);
  return getLocalAiStatus();
}

function emitProgressLine(line, onProgress) {
  if (!line.trim()) return;
  let update;
  try {
    update = JSON.parse(line);
  } catch {
    return;
  }
  if (update?.error) throw new Error(String(update.error).slice(0, 500));
  const total = Number(update?.total) || 0;
  const completed = Number(update?.completed) || 0;
  onProgress({
    status: typeof update?.status === "string" ? update.status.slice(0, 160) : "Downloading model",
    completed,
    total,
    percent: total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0,
  });
}

module.exports = {
  MODEL_CATALOG,
  OLLAMA_BASE_URL,
  OLLAMA_DOWNLOAD_URL,
  findOllamaExecutable,
  getLocalAiStatus,
  pullLocalModel,
  recommendLocalModel,
  startOllama,
  validateLocalModelName,
};
