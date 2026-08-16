interface AtlasDesktopBridge {
  isDesktop: true;
  platform: string;
  selectFiles: () => Promise<AtlasSelectedFile[]>;
  selectFolder: () => Promise<{ name: string; path: string } | null>;
  fetchResearchSource: (url: string) => Promise<AtlasFetchedResearchSource>;
  apiRequest: <T>(input: { path: string; method?: "GET" | "POST" | "PATCH"; body?: Record<string, unknown> }) => Promise<T>;
  openExternal: (url: string) => Promise<boolean>;
  importExtension: () => Promise<AtlasExtensionManifest | null>;
  saveExtensionTemplate: () => Promise<string | null>;
  getProvider: () => Promise<AtlasProviderState>;
  saveProvider: (input: { config: AtlasProviderConfig }) => Promise<AtlasProviderState>;
  testProvider: (input?: { config?: AtlasProviderConfig }) => Promise<{ ok: boolean; message: string }>;
  providerChat: (input: { mode: "chat" | "code"; messages: AtlasProviderMessage[]; attachmentIds?: string[]; requestId?: string }) => Promise<string>;
  cancelProviderChat: (requestId: string) => Promise<boolean>;
  onProviderChatChunk: (callback: (update: { requestId: string; chunk: string }) => void) => () => void;
  providerImage: (prompt: string) => Promise<{ dataUrl: string; revisedPrompt: string | null }>;
  startDictation: () => Promise<{ cancelled: boolean; text: string; confidence: number }>;
  stopDictation: () => Promise<boolean>;
  getCompanion: () => Promise<AtlasCompanionState>;
  copyCompanionToken: () => Promise<boolean>;
  rotateCompanionToken: () => Promise<AtlasCompanionState>;
  windowControl: (action: "minimize" | "maximize" | "close") => void;
}

interface AtlasSelectedFile {
  id: string;
  name: string;
  size: number;
}

interface AtlasFetchedResearchSource {
  title: string;
  url: string;
  hostname: string;
  content: string;
  contentType: string;
  fetchedAt: string;
  bytes: number;
  truncated: boolean;
}

type AtlasProviderKind = "atlas";
type AtlasReasoningEffort = "none";

interface AtlasProviderConfig {
  provider: AtlasProviderKind;
  model: string;
  chatModel: string;
  imageModel: string;
  baseUrl: string;
  reasoningEffort: AtlasReasoningEffort;
}

interface AtlasProviderState {
  config: AtlasProviderConfig;
  hasApiKey: boolean;
  encryptionAvailable: boolean;
}

interface AtlasProviderMessage {
  role: "user" | "assistant";
  content: string;
}


interface AtlasCompanionState {
  running: boolean;
  url: string;
  token: string;
  error: string | null;
  encrypted: boolean;
}

interface AtlasExtensionManifest {
  schemaVersion: 1;
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: string[];
}

interface Window {
  atlasDesktop?: AtlasDesktopBridge;
}
