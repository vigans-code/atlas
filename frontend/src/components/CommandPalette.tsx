import { BookOpen, Braces, FileStack, FolderKanban, Image, MessageSquare, Moon, Search, Settings, Sun, Upload, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { navigate } from "../lib/router";
import { useChatStore } from "../stores/chats";
import { useFileStore } from "../stores/files";
import { useUiStore } from "../stores/ui";

interface CommandItem { label: string; detail: string; icon: LucideIcon; run: () => void }

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const createChat = useChatStore((state) => state.createChat);
  const addFiles = useFileStore((state) => state.addFiles);
  const { theme, setTheme } = useUiStore();
  const commands = useMemo<CommandItem[]>(() => [
    { label: "New chat", detail: "Start a conversation", icon: MessageSquare, run: () => { createChat(); navigate("/chat"); } },
    { label: "Generate image", detail: "Open the Image workspace", icon: Image, run: () => navigate("/image") },
    { label: "New code session", detail: "Build, explain, or debug code", icon: Braces, run: () => navigate("/code") },
    { label: "Search public sources", detail: "Open Atlas Search", icon: Search, run: () => navigate("/search") },
    { label: "Deep research", detail: "Research with saved public sources", icon: BookOpen, run: () => navigate("/search") },
    { label: "New project", detail: "Create a project workspace", icon: FolderKanban, run: () => { sessionStorage.setItem("atlas:new-project", "1"); window.dispatchEvent(new Event("atlas:new-project")); navigate("/projects"); } },
    { label: "Upload file", detail: "Add context to the shared library", icon: Upload, run: () => { navigate("/files"); if (window.atlasDesktop) void window.atlasDesktop.selectFiles().then(addFiles); } },
    { label: "Open library", detail: "Browse shared files", icon: FileStack, run: () => navigate("/files") },
    { label: "Open history", detail: "Search recent work", icon: FileStack, run: () => navigate("/history") },
    { label: "Open settings", detail: "Appearance, AI, security, and data", icon: Settings, run: () => navigate("/settings") },
    { label: theme === "light" ? "Use dark theme" : "Use light theme", detail: "Toggle the Atlas appearance", icon: theme === "light" ? Moon : Sun, run: () => setTheme(theme === "light" ? "dark" : "light") },
  ], [addFiles, createChat, setTheme, theme]);

  useEffect(() => { const show=()=>setOpen(true); const key=(event:KeyboardEvent)=>{ if ((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k") { event.preventDefault(); setOpen((value)=>!value); } if (event.key==="Escape") setOpen(false); }; window.addEventListener("atlas:command-palette",show); window.addEventListener("keydown",key); return()=>{window.removeEventListener("atlas:command-palette",show);window.removeEventListener("keydown",key);}; }, []);
  useEffect(() => { if (open) window.setTimeout(() => inputRef.current?.focus(), 0); else setQuery(""); }, [open]);
  const filtered = commands.filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(query.toLowerCase()));
  const choose = (item: CommandItem) => { item.run(); setOpen(false); };
  if (!open) return null;
  return <div className="fixed inset-0 z-[100] flex justify-center bg-black/55 px-4 pt-[12vh] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Search and commands" onMouseDown={(event) => { if (event.target===event.currentTarget) setOpen(false); }}><div className="h-fit w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--atlas-border)] bg-[var(--atlas-popover)] shadow-2xl"><div className="flex h-14 items-center border-b border-[var(--atlas-border)] px-4"><Search className="mr-3 h-4 w-4 text-[var(--atlas-subtle)]" /><input ref={inputRef} value={query} onChange={(event)=>setQuery(event.target.value)} onKeyDown={(event)=>{if(event.key==="Enter"&&filtered[0])choose(filtered[0]);}} placeholder="Search commands..." className="min-w-0 flex-1 bg-transparent text-sm text-[var(--atlas-text)] outline-none placeholder:text-[var(--atlas-subtle)]" /><button type="button" onClick={()=>setOpen(false)} aria-label="Close command palette" className="atlas-icon-button"><X className="h-4 w-4" /></button></div><div className="max-h-96 overflow-y-auto p-2">{filtered.map((item)=>{const Icon=item.icon;return <button key={item.label} type="button" onClick={()=>choose(item)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-[var(--atlas-hover)]"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--atlas-elevated)]"><Icon className="h-4 w-4 text-[var(--atlas-muted)]" /></div><div><p className="text-sm text-[var(--atlas-text)]">{item.label}</p><p className="mt-0.5 text-[11px] text-[var(--atlas-subtle)]">{item.detail}</p></div></button>;})}{filtered.length===0&&<p className="px-3 py-8 text-center text-sm text-[var(--atlas-subtle)]">No matching command</p>}</div><div className="border-t border-[var(--atlas-border)] px-4 py-2.5 text-[10px] text-[var(--atlas-subtle)]">Enter chooses the first result · Esc closes</div></div></div>;
}
