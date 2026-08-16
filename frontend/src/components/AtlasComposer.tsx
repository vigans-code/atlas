import { ArrowUp, Braces, ChevronDown, Database, FileImage, FolderOpen, Globe2, Image, Paperclip, Plus, Search, Sparkles, X } from "lucide-react";
import { type FormEvent, type KeyboardEvent, type ReactNode, useRef, useState } from "react";

export type AtlasComposerTool = "auto" | "web" | "research" | "image" | "code" | "data" | "public-search";

export interface AtlasComposerAttachment {
  id: string;
  name: string;
  size: number;
}

interface AtlasComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string, tool: AtlasComposerTool) => void;
  attachments?: AtlasComposerAttachment[];
  onPickFiles?: () => void;
  onOpenLibrary?: () => void;
  onRemoveAttachment?: (id: string) => void;
  onError?: (message: string) => void;
  busy?: boolean;
  onStop?: () => void;
  placeholder?: string;
  secondaryActions?: ReactNode;
}

const tools: Array<{ id: AtlasComposerTool; label: string; description: string; icon: typeof Globe2; available: boolean }> = [
  { id: "web", label: "Web Search", description: "Current public web information", icon: Globe2, available: true },
  { id: "public-search", label: "Public Information", description: "Structured Atlas Search", icon: Search, available: true },
  { id: "image", label: "Image Generation", description: "Open the Image workspace", icon: Image, available: true },
  { id: "code", label: "Code", description: "Open the coding workspace", icon: Braces, available: true },
  { id: "research", label: "Research", description: "Multi-step cited research", icon: Sparkles, available: false },
  { id: "data", label: "Data Analysis", description: "Analyze structured datasets", icon: Database, available: false },
];

export function AtlasComposer({ value, onChange, onSubmit, attachments = [], onPickFiles, onOpenLibrary, onRemoveAttachment, onError, busy = false, onStop, placeholder = "Ask Atlas anything...", secondaryActions }: AtlasComposerProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [tool, setTool] = useState<AtlasComposerTool>("auto");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!value.trim() || busy) return;
    onSubmit(value.trim(), tool);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); }
  };
  const paste = async () => {
    setAddOpen(false);
    try {
      const content = await navigator.clipboard.readText();
      if (!content.trim()) throw new Error("The clipboard does not contain text.");
      onChange(`${value}${value ? "\n" : ""}${content}`.slice(0, 16_000));
      inputRef.current?.focus();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Atlas could not read the clipboard.");
    }
  };
  const selectedTool = tools.find((item) => item.id === tool);

  return <form onSubmit={submit} className="atlas-composer relative rounded-[1.4rem] border p-2">
    {attachments.length > 0 && <div className="flex flex-wrap gap-2 border-b border-[var(--atlas-border)] px-2 pb-2">{attachments.map((file) => <span key={file.id} className="flex max-w-full items-center rounded-lg bg-[var(--atlas-elevated)] px-2 py-1 text-[11px] text-[var(--atlas-muted)]"><Paperclip className="mr-1.5 h-3 w-3 shrink-0" /><span className="truncate">{file.name}</span>{onRemoveAttachment && <button type="button" onClick={() => onRemoveAttachment(file.id)} className="ml-1.5 text-[var(--atlas-subtle)] hover:text-[var(--atlas-text)]" aria-label={`Remove ${file.name}`}><X className="h-3 w-3" /></button>}</span>)}</div>}
    <textarea ref={inputRef} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={onKeyDown} rows={2} maxLength={16_000} placeholder={placeholder} aria-label={placeholder} className="max-h-48 min-h-16 w-full resize-none bg-transparent px-3 py-3 text-[15px] leading-6 text-[var(--atlas-text)] outline-none placeholder:text-[var(--atlas-subtle)]" />
    <div className="flex items-center gap-1 px-1 pb-1">
      <div className="relative"><button type="button" onClick={() => { setAddOpen((open) => !open); setToolsOpen(false); }} aria-label="Add content" aria-expanded={addOpen} className="atlas-icon-button"><Plus className="h-4 w-4" /></button>{addOpen && <ComposerMenu className="left-0"><MenuAction icon={Paperclip} label="Upload file" onClick={() => { setAddOpen(false); onPickFiles?.(); }} /><MenuAction icon={FileImage} label="Upload image" onClick={() => { setAddOpen(false); onPickFiles?.(); }} /><MenuAction icon={FolderOpen} label="Add from Library" onClick={() => { setAddOpen(false); onOpenLibrary?.(); }} /><MenuAction icon={Paperclip} label="Paste content" onClick={() => void paste()} /></ComposerMenu>}</div>
      {secondaryActions}
      <div className="relative ml-1"><button type="button" onClick={() => { setTool("auto"); setToolsOpen(false); }} className={`atlas-composer-chip ${tool === "auto" ? "is-active" : ""}`}>Auto</button></div>
      <div className="relative"><button type="button" onClick={() => { setToolsOpen((open) => !open); setAddOpen(false); }} aria-expanded={toolsOpen} className={`atlas-composer-chip ${tool !== "auto" ? "is-active" : ""}`}>{selectedTool?.label ?? "Tools"}<ChevronDown className="h-3 w-3" /></button>{toolsOpen && <ComposerMenu className="bottom-9 left-0 w-64">{tools.map((item) => <button key={item.id} type="button" disabled={!item.available} onClick={() => { if (!item.available) return; setTool(item.id); setToolsOpen(false); }} className="flex w-full items-start rounded-lg px-3 py-2.5 text-left hover:bg-[var(--atlas-hover)] disabled:cursor-not-allowed disabled:opacity-40"><item.icon className="mr-3 mt-0.5 h-4 w-4 shrink-0 text-[var(--atlas-muted)]" /><span><strong className="block text-xs font-medium text-[var(--atlas-text)]">{item.label}</strong><small className="mt-0.5 block text-[10px] text-[var(--atlas-subtle)]">{item.description}{!item.available ? " · Later" : ""}</small></span></button>)}</ComposerMenu>}</div>
      {busy && onStop ? <button type="button" onClick={onStop} aria-label="Stop generation" className="atlas-stop-button ml-auto"><span /></button> : <button type="submit" disabled={!value.trim()} aria-label="Send" className="atlas-send-button ml-auto"><ArrowUp className="h-4 w-4" /></button>}
    </div>
  </form>;
}

function ComposerMenu({ className, children }: { className: string; children: ReactNode }) { return <div className={`absolute bottom-10 z-30 w-52 rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-popover)] p-1.5 shadow-2xl ${className}`}>{children}</div>; }
function MenuAction({ icon: Icon, label, onClick }: { icon: typeof Plus; label: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-xs text-[var(--atlas-muted)] hover:bg-[var(--atlas-hover)] hover:text-[var(--atlas-text)]"><Icon className="mr-3 h-4 w-4" />{label}</button>; }
