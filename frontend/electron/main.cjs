const { app, BrowserWindow, clipboard, dialog, ipcMain, net, protocol, safeStorage, session, shell } = require("electron");
const { randomBytes, randomUUID } = require("node:crypto");
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { DEFAULT_PROVIDER, resolveStoredProviderConfig, runProviderChat, runProviderImage, testProvider, validateProviderConfig } = require("./provider.cjs");
const { startCompanionServer } = require("./companion.cjs");
const { startNativeModel, stopNativeModel } = require("./native-model.cjs");
const { isPathInside, isSafeExternalUrl, sanitizeExtensionManifest, validateApiRequest } = require("./security.cjs");
const { fetchResearchSource, validateResearchUrl } = require("./research.cjs");

const isDevelopment = Boolean(process.env.ATLAS_DESKTOP_DEV_URL);
let mainWindow;
let companionServer;
let companionToken;
let companionError = null;
let nativeModelProcess;
let nativeModelError = null;
const selectedFiles = new Map();
const providerChatControllers = new Map();
const dictationProcesses = new Map();
const researchFetches = new Set();
const readableAttachmentExtensions = new Set([
  ".c", ".cc", ".cpp", ".cs", ".css", ".go", ".h", ".hpp", ".html", ".java", ".js", ".jsx",
  ".json", ".md", ".mjs", ".php", ".ps1", ".py", ".rb", ".rs", ".sh", ".sql", ".svg", ".toml",
  ".ts", ".tsx", ".txt", ".xml", ".yaml", ".yml",
]);

app.enableSandbox();

protocol.registerSchemesAsPrivileged([
  {
    scheme: "atlas",
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 360,
    minHeight: 560,
    show: false,
    frame: false,
    backgroundColor: "#0c0c0e",
    autoHideMenuBar: true,
    title: "Atlas",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: isDevelopment,
      webviewTag: false,
      allowRunningInsecureContent: false,
      navigateOnDragDrop: false,
      safeDialogs: true,
      safeDialogsMessage: "Atlas blocked an unexpected dialog.",
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (!isDevelopment) mainWindow.maximize();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url, isDevelopment)) void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-attach-webview", (event) => event.preventDefault());

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const allowed = isDevelopment
      ? url.startsWith(process.env.ATLAS_DESKTOP_DEV_URL)
      : url.startsWith("atlas://app/");
    if (!allowed) event.preventDefault();
  });

  mainWindow.webContents.once("did-finish-load", () => {
    void mainWindow.webContents.executeJavaScript("window.location.hash = '#/'");
  });

  if (isDevelopment) {
    mainWindow.loadURL(process.env.ATLAS_DESKTOP_DEV_URL);
  } else {
    mainWindow.loadURL("atlas://app/index.html#/");
  }
}

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    const rendererRoot = path.resolve(__dirname, "..", "dist");
    protocol.handle("atlas", async (request) => {
      const requestedPath = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, "");
      const filePath = path.resolve(rendererRoot, requestedPath || "index.html");
      if (!isPathInside(rendererRoot, filePath)) {
        return new Response("Not found", { status: 404 });
      }
      const response = await net.fetch(pathToFileURL(filePath).toString());
      const headers = new Headers(response.headers);
      headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://127.0.0.1:8000 http://localhost:8000; img-src 'self' data: blob:; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Referrer-Policy", "no-referrer");
      headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    });
    session.defaultSession.setPermissionCheckHandler(() => false);
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
      callback(false);
    });
    const nativeModel = await startNativeModel();
    nativeModelProcess = nativeModel.process;
    nativeModelError = nativeModel.error;
    await startAtlasCompanion();
    createWindow();
  });
}

ipcMain.on("atlas:window-control", (event, action) => {
  if (!isTrustedSender(event)) return;
  if (!mainWindow || !["minimize", "maximize", "close"].includes(action)) return;
  if (action === "minimize") mainWindow.minimize();
  if (action === "maximize") {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
  if (action === "close") mainWindow.close();
});

ipcMain.handle("atlas:select-files", async (event) => {
  if (!mainWindow || !isTrustedSender(event)) return [];
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Add files to Atlas",
    properties: ["openFile", "multiSelections"],
  });
  if (result.canceled) return [];
  const selected = [];
  for (const filePath of result.filePaths.slice(0, 20)) {
    try {
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        const id = randomUUID();
        selectedFiles.set(id, filePath);
        selected.push({ id, name: path.basename(filePath), size: stats.size });
      }
    } catch {
      // Skip files that changed or became inaccessible after selection.
    }
  }
  while (selectedFiles.size > 100) selectedFiles.delete(selectedFiles.keys().next().value);
  return selected;
});

ipcMain.handle("atlas:research-fetch", async (event, url) => {
  if (!isTrustedSender(event)) return null;
  if (researchFetches.has(event.sender.id)) throw new Error("Wait for the current source to finish importing.");
  validateResearchUrl(url);
  researchFetches.add(event.sender.id);
  try {
    return await fetchResearchSource(url);
  } finally {
    researchFetches.delete(event.sender.id);
  }
});

ipcMain.handle("atlas:api-request", async (event, input) => {
  if (!isTrustedSender(event)) return null;
  const request = validateApiRequest(input);
  const response = await net.fetch(`http://127.0.0.1:8000${request.path}`, {
    method: request.method,
    headers: request.body === null ? undefined : { "Content-Type": "application/json" },
    body: request.body === null ? undefined : JSON.stringify(request.body),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload && typeof payload.detail === "string" ? payload.detail : `Atlas API returned ${response.status}.`;
    throw new Error(detail.slice(0, 500));
  }
  return payload;
});

ipcMain.handle("atlas:open-external", async (event, url) => {
  if (!isTrustedSender(event) || !isSafeExternalUrl(url, false)) return false;
  await shell.openExternal(url);
  return true;
});

ipcMain.handle("atlas:provider-get", async (event) => {
  if (!isTrustedSender(event)) return null;
  return publicProviderState(await readProviderDocument());
});

ipcMain.handle("atlas:provider-save", async (event, input) => {
  if (!isTrustedSender(event)) return null;
  const document = await readProviderDocument();
  const config = validateProviderConfig(input?.config);
  document.config = config;
  delete document.encryptedApiKey;
  await writeProviderDocument(document);
  return publicProviderState(document);
});

ipcMain.handle("atlas:provider-test", async (event, input) => {
  if (!isTrustedSender(event)) return null;
  const document = await readProviderDocument();
  const config = input?.config ? validateProviderConfig(input.config) : document.config;
  if (nativeModelError) throw new Error(nativeModelError);
  return testProvider({ config });
});

ipcMain.handle("atlas:provider-chat", async (event, input) => {
  if (!isTrustedSender(event)) return null;
  const document = await readProviderDocument();
  const attachmentText = await readSelectedAttachments(input?.attachmentIds);
  const requestId = typeof input?.requestId === "string" && /^[a-zA-Z0-9-]{1,100}$/.test(input.requestId) ? input.requestId : null;
  const controller = new AbortController();
  if (requestId) providerChatControllers.set(requestId, { controller, senderId: event.sender.id });
  try {
    return await runProviderChat({
      config: document.config,
      mode: input?.mode === "code" ? "code" : "chat",
      messages: input?.messages,
      attachmentText,
      signal: controller.signal,
      onChunk: requestId ? (chunk) => {
        if (!event.sender.isDestroyed()) event.sender.send("atlas:provider-chat-chunk", { requestId, chunk });
      } : undefined,
    });
  } finally {
    if (requestId) providerChatControllers.delete(requestId);
  }
});

ipcMain.handle("atlas:provider-chat-cancel", async (event, requestId) => {
  if (!isTrustedSender(event) || typeof requestId !== "string") return false;
  const active = providerChatControllers.get(requestId);
  if (!active || active.senderId !== event.sender.id) return false;
  active.controller.abort();
  return true;
});

ipcMain.handle("atlas:companion-get", async (event) => {
  if (!isTrustedSender(event)) return null;
  const token = await getCompanionToken();
  return publicCompanionState(token);
});

ipcMain.handle("atlas:companion-copy-token", async (event) => {
  if (!isTrustedSender(event)) return false;
  clipboard.writeText(await getCompanionToken());
  return true;
});

ipcMain.handle("atlas:companion-rotate-token", async (event) => {
  if (!isTrustedSender(event)) return null;
  const token = await rotateCompanionToken();
  return publicCompanionState(token);
});

ipcMain.handle("atlas:dictation-start", async (event) => {
  if (!isTrustedSender(event)) return null;
  if (process.platform !== "win32") throw new Error("Local dictation is currently available on Windows only.");
  const senderId = event.sender.id;
  if (dictationProcesses.has(senderId)) throw new Error("Dictation is already listening.");
  const powershell = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const scriptPath = path.join(__dirname, "dictation.ps1");
  const child = spawn(powershell, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-TimeoutSeconds", "15"], {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  dictationProcesses.set(senderId, child);
  try {
    return await collectDictationResult(child);
  } finally {
    dictationProcesses.delete(senderId);
  }
});

ipcMain.handle("atlas:dictation-stop", async (event) => {
  if (!isTrustedSender(event)) return false;
  const child = dictationProcesses.get(event.sender.id);
  if (!child) return false;
  child.atlasCancelled = true;
  child.kill();
  return true;
});

ipcMain.handle("atlas:provider-image", async (event, prompt) => {
  if (!isTrustedSender(event)) return null;
  const document = await readProviderDocument();
  return runProviderImage({ config: document.config, prompt });
});

ipcMain.handle("atlas:select-folder", async (event) => {
  if (!mainWindow || !isTrustedSender(event)) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Open a project folder",
    properties: ["openDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const folderPath = path.resolve(result.filePaths[0]);
  return { name: path.basename(folderPath), path: folderPath };
});

ipcMain.handle("atlas:import-extension", async (event) => {
  if (!mainWindow || !isTrustedSender(event)) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Import an Atlas extension manifest",
    filters: [{ name: "Atlas extension manifest", extensions: ["json"] }],
    properties: ["openFile"],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  const stats = await fs.stat(filePath);
  if (stats.size > 64 * 1024) throw new Error("Extension manifests must be smaller than 64 KB.");
  const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
  return sanitizeExtensionManifest(parsed);
});

ipcMain.handle("atlas:save-extension-template", async (event) => {
  if (!mainWindow || !isTrustedSender(event)) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Save an Atlas extension manifest template",
    defaultPath: "atlas-extension.json",
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (result.canceled || !result.filePath) return null;
  const template = {
    schemaVersion: 1,
    id: "com.example.my-extension",
    name: "My Atlas Extension",
    version: "0.1.0",
    description: "Describe what this extension contributes.",
    author: "Your name",
    permissions: [],
    contributes: { commands: [], tools: [], panels: [], themes: [], prompts: [] },
  };
  await fs.writeFile(result.filePath, `${JSON.stringify(template, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return result.filePath;
});

function isTrustedSender(event) {
  const url = event.senderFrame?.url ?? "";
  if (isDevelopment) return url.startsWith(process.env.ATLAS_DESKTOP_DEV_URL);
  return url.startsWith("atlas://app/");
}

function providerConfigPath() {
  return path.join(app.getPath("userData"), "provider-config.json");
}

function companionConfigPath() {
  return path.join(app.getPath("userData"), "vscode-companion.json");
}

async function startAtlasCompanion() {
  try {
    await getCompanionToken();
    companionServer = await startCompanionServer({
      getToken: () => companionToken,
      chat: async ({ mode, messages }) => {
        const document = await readProviderDocument();
        return runProviderChat({
          config: document.config,
          mode,
          messages,
        });
      },
    });
    companionError = null;
  } catch (error) {
    companionError = String(error?.message || "The VS Code companion bridge could not start.").slice(0, 300);
  }
}

async function getCompanionToken() {
  if (companionToken) return companionToken;
  try {
    const parsed = JSON.parse(await fs.readFile(companionConfigPath(), "utf8"));
    if (typeof parsed.encryptedToken === "string" && safeStorage.isEncryptionAvailable()) {
      const decrypted = safeStorage.decryptString(Buffer.from(parsed.encryptedToken, "base64"));
      if (/^[a-zA-Z0-9_-]{43}$/.test(decrypted)) {
        companionToken = decrypted;
        return companionToken;
      }
    }
  } catch {
    // Generate a new pairing secret if the saved value is absent or unreadable.
  }
  return rotateCompanionToken();
}

async function rotateCompanionToken() {
  companionToken = randomBytes(32).toString("base64url");
  if (safeStorage.isEncryptionAvailable()) {
    const document = {
      version: 1,
      encryptedToken: safeStorage.encryptString(companionToken).toString("base64"),
    };
    await fs.mkdir(path.dirname(companionConfigPath()), { recursive: true });
    await fs.writeFile(companionConfigPath(), `${JSON.stringify(document, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  }
  return companionToken;
}

function publicCompanionState(token) {
  return {
    running: Boolean(companionServer),
    url: companionServer?.url || "http://127.0.0.1:47635",
    token,
    error: companionError,
    encrypted: safeStorage.isEncryptionAvailable(),
  };
}

async function readProviderDocument() {
  const fallback = { version: 1, installationId: randomUUID(), config: { ...DEFAULT_PROVIDER } };
  try {
    const parsed = JSON.parse(await fs.readFile(providerConfigPath(), "utf8"));
    const savedConfig = resolveStoredProviderConfig(parsed.config);
    return {
      version: 1,
      installationId: typeof parsed.installationId === "string" && parsed.installationId.length <= 100 ? parsed.installationId : fallback.installationId,
      config: savedConfig,
    };
  } catch {
    // Migrate unreadable or legacy third-party provider settings to the only
    // supported Atlas Native configuration, removing any obsolete credential.
    await writeProviderDocument(fallback).catch(() => undefined);
    return fallback;
  }
}

async function writeProviderDocument(document) {
  await fs.mkdir(path.dirname(providerConfigPath()), { recursive: true });
  await fs.writeFile(providerConfigPath(), `${JSON.stringify(document, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}

function publicProviderState(document) {
  return {
    config: document.config,
    hasApiKey: false,
    encryptionAvailable: false,
  };
}

function collectDictationResult(child) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > 32_000) child.kill();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 8_000) child.kill();
    });
    child.once("error", () => reject(new Error("Windows dictation could not start.")));
    child.once("close", (code, signal) => {
      if (signal || child.atlasCancelled) return resolve({ cancelled: true, text: "", confidence: 0 });
      try {
        const result = JSON.parse(stdout.trim());
        if (!result.ok) throw new Error(result.error || "No speech was detected.");
        resolve({ cancelled: false, text: String(result.text).slice(0, 4_000), confidence: Number(result.confidence) || 0 });
      } catch (error) {
        reject(new Error(code === 0 ? error.message : (stderr.trim() || "Windows dictation failed.").slice(0, 500)));
      }
    });
  });
}

async function readSelectedAttachments(ids) {
  if (!Array.isArray(ids) || !ids.length) return "";
  const parts = [];
  let totalCharacters = 0;
  for (const id of ids.slice(0, 20)) {
    if (typeof id !== "string") continue;
    const filePath = selectedFiles.get(id);
    selectedFiles.delete(id);
    if (!filePath) continue;
    const extension = path.extname(filePath).toLowerCase();
    const name = path.basename(filePath);
    if (!readableAttachmentExtensions.has(extension)) {
      parts.push(`--- ${name} ---\n[Skipped: unsupported text file type]`);
      continue;
    }
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile() || stats.size > 1024 * 1024) {
        parts.push(`--- ${name} ---\n[Skipped: file exceeds the 1 MB attachment limit]`);
        continue;
      }
      const remaining = 100_000 - totalCharacters;
      if (remaining <= 0) break;
      const contents = (await fs.readFile(filePath, "utf8")).slice(0, remaining);
      totalCharacters += contents.length;
      parts.push(`--- ${name} ---\n${contents}`);
    } catch {
      parts.push(`--- ${name} ---\n[Skipped: file is no longer accessible]`);
    }
  }
  return parts.join("\n\n");
}


app.on("window-all-closed", () => {
  for (const child of dictationProcesses.values()) child.kill();
  for (const active of providerChatControllers.values()) active.controller.abort();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  void companionServer?.close();
  stopNativeModel(nativeModelProcess);
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
