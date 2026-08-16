import { Braces, Download, FileJson2, PackageCheck, Puzzle, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { useExtensionStore } from "../../stores/extensions";

type ExtensionTab = "installed" | "discover" | "develop";

const developmentKits = [
  { name: "Tool SDK", description: "Declare permission-scoped tools for Code Agent.", icon: Braces },
  { name: "Theme Kit", description: "Create colors, typography, and component tokens.", icon: Puzzle },
  { name: "Native Tool SDK", description: "Extend Atlas workflows without replacing the Atlas-owned model.", icon: PackageCheck },
];

export function Extensions() {
  const [tab, setTab] = useState<ExtensionTab>("installed");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { extensions, installManifest, toggleExtension, removeExtension } = useExtensionStore();

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return extensions.filter((extension) => !normalized || `${extension.name} ${extension.author} ${extension.description}`.toLowerCase().includes(normalized));
  }, [extensions, query]);

  const importManifest = async () => {
    setError(null);
    setNotice(null);
    if (!window.atlasDesktop) {
      setError("Manifest import is available in the desktop app.");
      return;
    }
    try {
      const manifest = await window.atlasDesktop.importExtension();
      if (!manifest) return;
      installManifest(manifest);
      setNotice(`Imported ${manifest.name}. Code execution remains disabled.`);
      setTab("installed");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The manifest could not be imported.");
    }
  };

  const saveTemplate = async () => {
    setError(null);
    setNotice(null);
    if (!window.atlasDesktop) {
      setError("Template export is available in the desktop app.");
      return;
    }
    try {
      const savedPath = await window.atlasDesktop.saveExtensionTemplate();
      if (savedPath) setNotice(`Template saved to ${savedPath}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The template could not be saved.");
    }
  };

  return (
    <div className="atlas-page h-full overflow-y-auto px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-end justify-between gap-4">
          <div><div className="atlas-eyebrow mb-3">Community studio / 06</div><h1 className="text-4xl text-white">Extensions</h1><p className="mt-2 text-sm text-zinc-500">Build and register community additions without expanding the core app.</p></div>
          <button type="button" onClick={() => void importManifest()} className="atlas-accent-bg flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium text-white hover:brightness-110"><Download className="h-4 w-4" /> Import manifest</button>
        </header>

        <div className="mt-7 flex gap-1 border-b border-white/[0.07]">
          <Tab active={tab === "installed"} onClick={() => setTab("installed")}>Installed</Tab>
          <Tab active={tab === "discover"} onClick={() => setTab("discover")}>Discover</Tab>
          <Tab active={tab === "develop"} onClick={() => setTab("develop")}>Develop</Tab>
        </div>

        {notice && <div className="mt-5 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.05] px-4 py-3 text-xs text-emerald-200/70">{notice}</div>}
        {error && <div className="mt-5 rounded-xl border border-red-400/10 bg-red-400/[0.05] px-4 py-3 text-xs text-red-200/70">{error}</div>}

        {tab === "installed" && (
          <section className="mt-6">
            <label className="relative block max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search installed extensions" className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] pl-10 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[var(--atlas-accent)] focus:outline-none" /></label>
            {filtered.length ? <div className="mt-5 space-y-3">{filtered.map((extension) => (
              <article key={extension.id} className="flex items-center rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl atlas-accent-soft"><Puzzle className="h-4 w-4" /></div>
                <div className="ml-3 min-w-0"><div className="flex items-center gap-2"><h2 className="truncate text-sm font-medium text-zinc-200">{extension.name}</h2><span className="text-[10px] text-zinc-600">v{extension.version}</span></div><p className="mt-1 truncate text-xs text-zinc-600">{extension.description} · {extension.author}</p></div>
                <div className="ml-auto flex items-center gap-2"><button type="button" onClick={() => toggleExtension(extension.id)} className={`rounded-lg px-3 py-2 text-xs ${extension.enabled ? "atlas-accent-soft" : "bg-white/[0.04] text-zinc-500"}`}>{extension.enabled ? "Enabled metadata" : "Disabled"}</button><button type="button" onClick={() => removeExtension(extension.id)} aria-label={`Remove ${extension.name}`} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-600 hover:bg-red-400/10 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button></div>
              </article>
            ))}</div> : <EmptyInstalled onImport={importManifest} />}
          </section>
        )}

        {tab === "discover" && (
          <section className="mt-6">
            <div className="rounded-2xl border border-amber-400/10 bg-amber-400/[0.04] p-5"><div className="flex items-center gap-2 text-sm font-medium text-amber-100/80"><ShieldCheck className="h-4 w-4" /> Community catalog is intentionally offline</div><p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">Remote installation is disabled until package signing, permission review, sandbox execution, update verification, and a moderation process are implemented. Community manifests can be reviewed and imported locally today.</p></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">{developmentKits.map((kit) => <article key={kit.name} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5"><kit.icon className="h-5 w-5 text-zinc-500" /><h2 className="mt-4 text-sm font-medium text-zinc-200">{kit.name}</h2><p className="mt-2 text-xs leading-5 text-zinc-600">{kit.description}</p><span className="mt-4 inline-block rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] text-zinc-600">Specification draft</span></article>)}</div>
          </section>
        )}

        {tab === "develop" && (
          <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6"><FileJson2 className="h-5 w-5 text-zinc-500" /><h2 className="mt-4 text-lg font-medium text-white">Start an extension</h2><p className="mt-2 text-sm leading-6 text-zinc-500">Create a versioned manifest, declare only the permissions you need, and contribute through a focused feature module. Imported manifests are validated and stored as metadata; they cannot execute code.</p><button type="button" onClick={() => void saveTemplate()} className="atlas-accent-bg mt-5 rounded-lg px-4 py-2.5 text-sm font-medium text-white hover:brightness-110">Save manifest template</button></div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5"><h3 className="text-sm font-medium text-zinc-300">Security requirements</h3><ul className="mt-4 space-y-3 text-xs leading-5 text-zinc-600"><li>• Stable reverse-domain extension ID</li><li>• Semantic version</li><li>• Explicit permission list</li><li>• No renderer secrets</li><li>• No runtime code execution yet</li><li>• Reviewable source and tests</li></ul></div>
          </section>
        )}
      </div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`border-b-2 px-3 py-3 text-xs transition ${active ? "border-[var(--atlas-accent)] text-zinc-200" : "border-transparent text-zinc-600 hover:text-zinc-300"}`}>{children}</button>;
}

function EmptyInstalled({ onImport }: { onImport: () => void }) {
  return <div className="mt-6 rounded-2xl border border-dashed border-white/10 py-20 text-center"><Puzzle className="mx-auto h-6 w-6 text-zinc-700" /><h2 className="mt-4 text-sm font-medium text-zinc-300">No community manifests installed</h2><p className="mt-2 text-xs text-zinc-600">Import a reviewed JSON manifest to begin.</p><button type="button" onClick={onImport} className="mt-5 rounded-lg border border-white/10 px-4 py-2 text-xs text-zinc-300 hover:bg-white/[0.05]">Import manifest</button></div>;
}
