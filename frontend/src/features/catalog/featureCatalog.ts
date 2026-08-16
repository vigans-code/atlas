export type FeatureStatus = "available" | "preview" | "planned";

export interface AtlasFeature {
  id: string;
  name: string;
  category: string;
  description: string;
  status: FeatureStatus;
}

export const featureCatalog: AtlasFeature[] = [
  { id: "native-chat", name: "Atlas Native chat", category: "Chat", description: "Local conversations using the independently trained Atlas checkpoint.", status: "preview" },
  { id: "chat-history", name: "Saved chat history", category: "Chat", description: "Rename, pin, archive, branch, edit, retry, and continue local conversations.", status: "available" },
  { id: "stream-controls", name: "Generation controls", category: "Chat", description: "Stream responses and stop an in-progress generation.", status: "available" },
  { id: "public-research", name: "Public-source research", category: "Search", description: "Capture HTTPS source snapshots and answer with explicit citations.", status: "preview" },
  { id: "code-context", name: "Code context", category: "Code", description: "Send selected code and local project context to Atlas without silent writes.", status: "preview" },
  { id: "local-projects", name: "Local projects", category: "Projects", description: "Organize local folders and choose active project context.", status: "preview" },
  { id: "file-library", name: "Context library", category: "Library", description: "Attach desktop files and send them between current workspaces.", status: "preview" },
  { id: "themes", name: "Appearance and accessibility", category: "Settings", description: "Theme, text sizing, density, contrast, and reduced-motion preferences.", status: "available" },
  { id: "vscode", name: "VS Code companion", category: "Extensions", description: "Pair the desktop app with an explicitly authorized editor command.", status: "preview" },
  { id: "auth-api", name: "Account session API", category: "Security", description: "Argon2 credentials and revocable server-side sessions for API clients.", status: "available" },
  { id: "durable-storage", name: "Durable workspace sync", category: "Platform", description: "Authenticated persistence for chats, projects, files, jobs, and artifacts.", status: "planned" },
  { id: "native-images", name: "Atlas Native images", category: "Image", description: "Image generation will require an independently trained Atlas image model.", status: "planned" },
];

export const featureCategories = ["All", ...new Set(featureCatalog.map((item) => item.category))];
