const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("atlasDesktop", {
  isDesktop: true,
  platform: process.platform,
  selectFiles: () => ipcRenderer.invoke("atlas:select-files"),
  selectFolder: () => ipcRenderer.invoke("atlas:select-folder"),
  fetchResearchSource: (url) => ipcRenderer.invoke("atlas:research-fetch", url),
  apiRequest: (input) => ipcRenderer.invoke("atlas:api-request", input),
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
  getCompanion: () => ipcRenderer.invoke("atlas:companion-get"),
  copyCompanionToken: () => ipcRenderer.invoke("atlas:companion-copy-token"),
  rotateCompanionToken: () => ipcRenderer.invoke("atlas:companion-rotate-token"),
  windowControl: (action) => {
    if (["minimize", "maximize", "close"].includes(action)) {
      ipcRenderer.send("atlas:window-control", action);
    }
  },
});
