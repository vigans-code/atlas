import { Braces, File, FileArchive, FileImage, FileText, MessageSquare, Search, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";

import { navigate } from "../../lib/router";
import { type AtlasFileKind, useFileStore } from "../../stores/files";
import { useLauncherStore } from "../../stores/launcher";

export function Files() {
  const { files, addFiles, renameFile, removeFile } = useFileStore();
  const sendFilesTo = useLauncherStore((state) => state.sendFilesTo);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const filtered = useMemo(() => files.filter((file) => `${file.displayName} ${file.kind}`.toLowerCase().includes(query.toLowerCase())), [files, query]);

  const upload = async () => {
    if (!window.atlasDesktop) {
      setError("File selection is available in the Atlas desktop app.");
      return;
    }
    try {
      addFiles(await window.atlasDesktop.selectFiles());
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Atlas could not add those files.");
    }
  };

  const sendTo = (id: string, target: "chat" | "code" | "image") => {
    sendFilesTo(target, [id]);
    navigate(`/${target}`);
  };

  return (
    <div className="atlas-page h-full overflow-y-auto px-5 py-8 sm:px-8">
      <main className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div><h1 className="atlas-page-title">Library</h1><p className="atlas-page-description">A shared context library for Chat, Image, and Code.</p></div>
          <button type="button" onClick={() => void upload()} className="atlas-primary-button sm:ml-auto"><Upload className="h-4 w-4" />Upload files</button>
        </header>
        <div className="mt-6 flex h-10 max-w-md items-center rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-panel)] px-3"><Search className="mr-2 h-4 w-4 text-[var(--atlas-subtle)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files" className="min-w-0 flex-1 bg-transparent text-sm text-[var(--atlas-text)] outline-none placeholder:text-[var(--atlas-subtle)]" /></div>
        {error && <p role="alert" className="mt-3 text-sm text-rose-400">{error}</p>}
        <p className="mt-3 text-xs text-[var(--atlas-subtle)]">Files in this first migration increment remain available for the current desktop session. Durable encrypted storage is the next backend phase.</p>

        {filtered.length ? <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--atlas-border)] bg-[var(--atlas-panel)]">
          {filtered.map((file) => { const Icon = fileIcon(file.kind); return <article key={file.id} className="flex flex-col gap-3 border-b border-[var(--atlas-border)] p-4 last:border-0 sm:flex-row sm:items-center">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--atlas-elevated)] text-[var(--atlas-muted)]"><Icon className="h-4 w-4" /></div>
            <div className="min-w-0 flex-1"><button type="button" onClick={() => { const name=window.prompt("Rename file", file.displayName); if (name) renameFile(file.id, name); }} className="max-w-full truncate text-left text-sm font-medium text-[var(--atlas-text)] hover:underline">{file.displayName}</button><p className="mt-1 text-xs capitalize text-[var(--atlas-subtle)]">{file.kind} · {formatSize(file.size)}</p></div>
            <div className="flex items-center gap-1"><button type="button" onClick={() => sendTo(file.id, "chat")} className="atlas-secondary-button"><MessageSquare className="h-3.5 w-3.5" />Chat</button>{file.kind === "code" && <button type="button" onClick={() => sendTo(file.id, "code")} className="atlas-secondary-button"><Braces className="h-3.5 w-3.5" />Code</button>}{file.kind === "image" && <button type="button" onClick={() => sendTo(file.id, "image")} className="atlas-secondary-button"><FileImage className="h-3.5 w-3.5" />Image</button>}<button type="button" onClick={() => removeFile(file.id)} aria-label={`Remove ${file.displayName}`} className="atlas-icon-button ml-1 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button></div>
          </article>; })}
        </div> : <div className="atlas-empty-state mt-8"><File className="h-5 w-5" /><h2>{query ? "No matching files" : "No files yet"}</h2><p>{query ? "Try a different name or file type." : "Upload a document, image, data file, or source file to use it across Atlas."}</p>{!query && <button type="button" onClick={() => void upload()} className="atlas-secondary-button mt-4"><Upload className="h-4 w-4" />Choose files</button>}</div>}
      </main>
    </div>
  );
}

function fileIcon(kind: AtlasFileKind) { return { image: FileImage, document: FileText, data: FileText, code: Braces, archive: FileArchive, other: File }[kind]; }
function formatSize(bytes: number) { return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`; }
