import { ArrowUp, Code2, Image, MessageSquare, Search } from "lucide-react";
import { useState } from "react";

import { AtlasAtom } from "../../components/AtlasAtom";
import { AtlasComposer, type AtlasComposerTool } from "../../components/AtlasComposer";
import { navigate } from "../../lib/router";
import { type LibraryFile, useFileStore } from "../../stores/files";
import { useLauncherStore } from "../../stores/launcher";

const actions = [
  { label: "Chat", description: "Ask anything", path: "/chat", target: "chat" as const, icon: MessageSquare },
  { label: "Image", description: "Create a visual", path: "/image", target: "image" as const, icon: Image },
  { label: "Code", description: "Build and debug", path: "/code", target: "code" as const, icon: Code2 },
  { label: "Search", description: "Research public sources", path: "/search", target: "search" as const, icon: Search },
];

const suggestions = [
  { label: "Explain a complex topic", target: "chat" as const, path: "/chat" },
  { label: "Help me write a Python API", target: "code" as const, path: "/code" },
  { label: "Research a public domain", target: "search" as const, path: "/search" },
  { label: "Generate a cinematic landscape", target: "image" as const, path: "/image" },
];

export function Home() {
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState<LibraryFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const setDraft = useLauncherStore((state) => state.setDraft);
  const sendFilesTo = useLauncherStore((state) => state.sendFilesTo);
  const addFiles = useFileStore((state) => state.addFiles);

  const launch = (target: "chat" | "image" | "code" | "search", path: string, value = "") => {
    if (value.trim()) setDraft(target, value.trim());
    navigate(path);
  };

  const submit = (value: string, tool: AtlasComposerTool) => {
    const target = tool === "image" ? "image" : tool === "code" ? "code" : tool === "web" || tool === "public-search" || tool === "research" ? "search" : "chat";
    const path = `/${target}`;
    setDraft(target, value);
    if (attachments.length) sendFilesTo(target, attachments.map((file) => file.id));
    navigate(path);
  };

  const pickFiles = async () => {
    if (!window.atlasDesktop) { setError("File selection is available in the Atlas desktop app."); return; }
    try { const selected = addFiles(await window.atlasDesktop.selectFiles()); setAttachments((current) => [...current, ...selected].slice(0, 20)); setError(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Atlas could not add those files."); }
  };

  return (
    <div className="atlas-home h-full overflow-y-auto px-5 py-10 sm:px-8">
      <main className="mx-auto flex min-h-full max-w-3xl flex-col justify-center py-10">
        <div className="text-center">
          <div className="atlas-home-mark mx-auto grid h-12 w-12 place-items-center rounded-2xl"><AtlasAtom size={30} /></div>
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.035em] text-[var(--atlas-text)] sm:text-4xl">What can I help with?</h1>
          <p className="mt-3 text-sm text-[var(--atlas-muted)]">Chat, create, code, or research from one calm workspace.</p>
        </div>

        <div className="mt-8"><AtlasComposer value={prompt} onChange={setPrompt} onSubmit={submit} attachments={attachments} onPickFiles={() => void pickFiles()} onOpenLibrary={() => navigate("/files")} onRemoveAttachment={(id) => setAttachments((current) => current.filter((file) => file.id !== id))} onError={setError} /></div>
        {error && <p role="alert" className="mt-2 text-center text-xs text-rose-400">{error}</p>}

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {actions.map((action) => <button key={action.label} type="button" onClick={() => launch(action.target, action.path)} className="atlas-tool-button"><action.icon className="h-4 w-4" /><span><strong>{action.label}</strong><small>{action.description}</small></span></button>)}
        </div>

        <section className="mt-10" aria-labelledby="suggestions-title">
          <h2 id="suggestions-title" className="mb-2 text-xs font-medium text-[var(--atlas-subtle)]">Try asking Atlas</h2>
          <div className="divide-y divide-[var(--atlas-border)] border-y border-[var(--atlas-border)]">
            {suggestions.map((suggestion) => <button key={suggestion.label} type="button" onClick={() => launch(suggestion.target, suggestion.path, suggestion.label)} className="flex w-full items-center py-3 text-left text-sm text-[var(--atlas-muted)] transition hover:text-[var(--atlas-text)]"><span>{suggestion.label}</span><ArrowUp className="ml-auto h-3.5 w-3.5 rotate-45" /></button>)}
          </div>
        </section>
      </main>
    </div>
  );
}
