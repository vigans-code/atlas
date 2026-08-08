export type FeatureStatus = "available" | "extension";

export interface AtlasFeature {
  id: string;
  name: string;
  category: string;
  description: string;
  status: FeatureStatus;
}

const groups: Record<string, string[]> = {
  Chat: [
    "Conversation history", "Conversation branching", "Pinned chats", "Chat search", "Markdown export",
    "Message editing", "Response regeneration", "Prompt templates", "Voice input", "Read aloud",
  ],
  "Code Agent": [
    "File context", "Repository map", "Multi-file edits", "Diff review", "Shell tools",
    "Test runner", "Lint runner", "Debugger assistance", "Safe refactoring", "Code explanations",
  ],
  Projects: [
    "Local folders", "Git repositories", "Project instructions", "Project memory", "Project templates",
    "Project tags", "Project archive", "Recent files", "Environment profiles", "Task boards",
  ],
  Images: [
    "Text to image", "Image editing", "Inpainting", "Outpainting", "Image variations",
    "Upscaling", "Background removal", "Transparent export", "Prompt presets", "Image galleries",
  ],
  Models: [
    "Multiple providers", "Custom endpoints", "Local models", "Automatic routing", "Provider fallback",
    "Per-task models", "Model parameters", "Context budgets", "Usage limits", "Provider health checks",
  ],
  Automation: [
    "Reusable tasks", "Scheduled tasks", "Workflow builder", "Event triggers", "Tool chains",
    "Approval gates", "Automatic retries", "Background jobs", "Desktop notifications", "Execution logs",
  ],
  Personalization: [
    "Color themes", "Accent colors", "Interface density", "Text sizing", "Keyboard shortcuts",
    "Custom layouts", "Custom CSS", "Display language", "Reduced motion", "Sound preferences",
  ],
  Files: [
    "File attachments", "PDF reading", "Document reading", "Spreadsheet analysis", "Image OCR",
    "Archive browsing", "Workspace search", "Watched folders", "File exports", "Drag and drop",
  ],
  Collaboration: [
    "Shared projects", "Workspace roles", "Comments", "Mentions", "Team activity",
    "Shared prompts", "Team preferences", "Audit history", "Review requests", "Live presence",
  ],
  "Privacy & Security": [
    "Local-only mode", "Encrypted storage", "Secret vault", "Session lock", "Data retention",
    "Tool permissions", "Network allowlist", "Process sandboxing", "Dependency auditing", "Privacy reports",
  ],
  Extensions: [
    "Plugin SDK", "Tool API", "Custom panels", "Custom commands", "Model adapters",
    "Theme packages", "Prompt packs", "Extension catalog", "Package signing", "Plugin isolation",
  ],
  Developer: [
    "REST API", "Command line interface", "Webhooks", "MCP connections", "JSON schemas",
    "Developer console", "Feature flags", "Diagnostics bundle", "Backup and restore", "Import and export",
  ],
};

const available = new Set([
  "chat-conversation-history",
  "code-agent-code-explanations",
  "projects-local-folders",
  "images-prompt-presets",
  "personalization-accent-colors",
  "personalization-interface-density",
  "personalization-text-sizing",
  "personalization-reduced-motion",
  "developer-feature-flags",
]);

export const featureCatalog: AtlasFeature[] = Object.entries(groups).flatMap(([category, names]) =>
  names.map((name) => {
    const id = `${slug(category)}-${slug(name)}`;
    return {
      id,
      name,
      category,
      description: `${name} support for the Atlas ${category.toLowerCase()} system.`,
      status: available.has(id) ? "available" : "extension",
    };
  }),
);

export const featureCategories = ["All", ...Object.keys(groups)];

function slug(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
