const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("atlasDesktop", {
  isDesktop: true,
  platform: process.platform,
  selectFiles: () => ipcRenderer.invoke("atlas:select-files"),
  selectFolder: () => ipcRenderer.invoke("atlas:select-folder"),
  fetchResearchSource: (url) => ipcRenderer.invoke("atlas:research-fetch", url),
  openExternal: (url) => ipcRenderer.invoke("atlas:open-external", url),
  importExtension: () => ipcRenderer.invoke("atlas:import-extension"),
  saveExtensionTemplate: () => ipcRenderer.invoke("atlas:save-extension-template"),
  getProvider: () => ipcRenderer.invoke("atlas:provider-get"),
  saveProvider: (input) => ipcRenderer.invoke("atlas:provider-save", input),
  testProvider: (input) => ipcRenderer.invoke("atlas:provider-test", input),
  providerChat: (input) => ipcRenderer.invoke("atlas:provider-chat", input),
  cancelProviderChat: (requestId) => ipcRenderer.invoke("atlas:provider-chat-cancel", requestId),
  onProviderChatChunk: (callback) => {
    const listener = (_event, update) => callback(update);
    ipcRenderer.on("atlas:provider-chat-chunk", listener);
    return () => ipcRenderer.removeListener("atlas:provider-chat-chunk", listener);
  },
  providerImage: (prompt) => ipcRenderer.invoke("atlas:provider-image", prompt),
  startDictation: () => ipcRenderer.invoke("atlas:dictation-start"),
  stopDictation: () => ipcRenderer.invoke("atlas:dictation-stop"),
  getLocalAiStatus: () => ipcRenderer.invoke("atlas:local-ai-status"),
  openLocalAiInstaller: () => ipcRenderer.invoke("atlas:local-ai-open-installer"),
  startLocalAi: () => ipcRenderer.invoke("atlas:local-ai-start"),
  pullLocalAiModel: (model) => ipcRenderer.invoke("atlas:local-ai-pull", model),
  cancelLocalAiModel: () => ipcRenderer.invoke("atlas:local-ai-cancel"),
  useLocalAiModel: (model) => ipcRenderer.invoke("atlas:local-ai-use", model),
  getCompanion: () => ipcRenderer.invoke("atlas:companion-get"),
  copyCompanionToken: () => ipcRenderer.invoke("atlas:companion-copy-token"),
  rotateCompanionToken: () => ipcRenderer.invoke("atlas:companion-rotate-token"),
  onLocalAiProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on("atlas:local-ai-progress", listener);
    return () => ipcRenderer.removeListener("atlas:local-ai-progress", listener);
  },
  windowControl: (action) => {
    if (["minimize", "maximize", "close"].includes(action)) {
      ipcRenderer.send("atlas:window-control", action);
    }
  },
});
