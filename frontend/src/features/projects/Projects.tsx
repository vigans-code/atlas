import { Clock3, FolderKanban, FolderOpen, MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import { useProjectStore } from "../../stores/projects";

export function Projects() {
  const { projects, activeProjectId, addProject, removeProject, setActiveProject } = useProjectStore();
  const [createOpen, setCreateOpen] = useState(() => {
    const requested = sessionStorage.getItem("atlas:new-project") === "1";
    sessionStorage.removeItem("atlas:new-project");
    return requested;
  });
  const [name, setName] = useState("");
  const [menuProject, setMenuProject] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const openCreate = () => {
      sessionStorage.removeItem("atlas:new-project");
      setCreateOpen(true);
    };
    window.addEventListener("atlas:new-project", openCreate);
    return () => window.removeEventListener("atlas:new-project", openCreate);
  }, []);

  const createProject = (event: FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;
    addProject({ name: cleanName, path: null });
    setName("");
    setCreateOpen(false);
    setNotice(`Created ${cleanName}.`);
  };

  const openFolder = async () => {
    if (!window.atlasDesktop) {
      setNotice("Folder selection is available in the desktop app.");
      return;
    }
    const folder = await window.atlasDesktop.selectFolder();
    if (!folder) return;
    addProject({ name: folder.name, path: folder.path });
    setNotice(`Opened ${folder.name}.`);
  };

  return (
    <div className="atlas-page h-full overflow-y-auto px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-end justify-between">
          <div>
            <div className="atlas-eyebrow mb-3">Workspace collection / 03</div><h1 className="text-4xl text-white">Projects</h1>
            <p className="mt-2 text-sm text-zinc-500">Organize code, conversations, and agent context.</p>
          </div>
          <button type="button" onClick={() => setCreateOpen(true)} className="atlas-accent-bg flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium text-white hover:brightness-110">
            <Plus className="h-4 w-4" /> New project
          </button>
        </header>

        {notice && <div className="mt-5 flex items-center rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs text-zinc-400"><span>{notice}</span><button type="button" onClick={() => setNotice(null)} className="ml-auto text-zinc-600 hover:text-white" aria-label="Dismiss"><X className="h-3.5 w-3.5" /></button></div>}

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-300">Your projects</h2>
            <span className="text-xs text-zinc-600">{projects.length} {projects.length === 1 ? "project" : "projects"}</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <article key={project.id} className={`atlas-catalog-card relative rounded-2xl border p-5 transition ${activeProjectId === project.id ? "border-[var(--atlas-accent)]" : "border-white/[0.07]"}`}>
                <div className="flex items-start">
                  <button type="button" onClick={() => setActiveProject(project.id)} className="grid h-10 w-10 place-items-center rounded-xl atlas-accent-soft" aria-label={`Use ${project.name}`}><FolderKanban className="h-5 w-5" /></button>
                  <button type="button" onClick={() => setMenuProject(menuProject === project.id ? null : project.id)} aria-label="Project options" className="ml-auto text-zinc-600 hover:text-white"><MoreHorizontal className="h-4 w-4" /></button>
                </div>
                {menuProject === project.id && (
                  <div className="absolute right-4 top-12 z-10 w-36 rounded-xl border border-white/10 bg-[#202329] p-1 shadow-xl">
                    <button type="button" onClick={() => { setActiveProject(project.id); setMenuProject(null); setNotice(`${project.name} is now active.`); }} className="w-full rounded-lg px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/[0.06]">Make active</button>
                    <button type="button" onClick={() => { removeProject(project.id); setMenuProject(null); setNotice(`Removed ${project.name}.`); }} className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-red-300/80 hover:bg-red-400/10"><Trash2 className="mr-2 h-3.5 w-3.5" /> Remove</button>
                  </div>
                )}
                <button type="button" onClick={() => setActiveProject(project.id)} className="mt-5 block w-full text-left">
                  <h3 className="truncate text-sm font-medium text-zinc-200">{project.name}</h3>
                  <p className="mt-1 truncate text-xs leading-5 text-zinc-600">{project.path ?? "Project without a local folder"}</p>
                </button>
                <div className="mt-5 flex items-center border-t border-white/[0.05] pt-4 text-[11px] text-zinc-600"><Clock3 className="mr-1.5 h-3 w-3" /> Updated {new Date(project.updatedAt).toLocaleDateString()}</div>
              </article>
            ))}
            <button type="button" onClick={() => void openFolder()} className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-zinc-600 transition hover:border-[var(--atlas-accent)] hover:text-zinc-300">
              <FolderOpen className="h-5 w-5" />
              <span className="mt-3 text-sm">Open a local folder</span>
            </button>
          </div>
        </section>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-project-title">
          <form onSubmit={createProject} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#181b20] p-6 shadow-2xl">
            <div className="flex items-start"><div><h2 id="create-project-title" className="text-lg font-semibold text-white">New project</h2><p className="mt-1 text-xs text-zinc-500">Create a workspace now; attach a local folder later.</p></div><button type="button" onClick={() => setCreateOpen(false)} className="ml-auto text-zinc-500 hover:text-white" aria-label="Close"><X className="h-4 w-4" /></button></div>
            <label className="mt-6 block"><span className="mb-2 block text-xs text-zinc-400">Project name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="My project" className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white placeholder:text-zinc-600 focus:border-[var(--atlas-accent)] focus:outline-none" /></label>
            <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-white/[0.05]">Cancel</button><button type="submit" disabled={!name.trim()} className="atlas-accent-bg rounded-lg px-4 py-2 text-sm font-medium text-white disabled:bg-zinc-700 disabled:text-zinc-500">Create</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
