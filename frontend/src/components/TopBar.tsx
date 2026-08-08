import { Circle, Minus, MoreHorizontal, Square, X } from "lucide-react";
import { useState } from "react";

import { navigate, usePathname } from "../lib/router";

export function TopBar() {
  const isDesktop = Boolean(window.atlasDesktop?.isDesktop);
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const pageName = pathname === "/chat" ? "Chat" : pathname === "/projects" ? "Projects" : pathname === "/research" ? "Research" : pathname === "/images" ? "Images" : pathname === "/extensions" ? "Extensions" : pathname === "/settings" ? "Settings" : "Code Agent";

  return (
    <header className="titlebar atlas-topbar relative z-30 flex h-14 shrink-0 items-center border-b border-white/[0.06] px-5">
      <div className="text-xs text-zinc-500 md:hidden">Atlas</div>
      <div className="hidden items-center gap-3 text-xs md:flex">
        <span className="flex items-center gap-2 uppercase tracking-[0.18em] text-zinc-500"><Circle className="h-1.5 w-1.5 fill-[var(--atlas-accent)] text-[var(--atlas-accent)]" /> Workspace</span>
        <span className="h-4 w-px bg-white/[0.08]" />
        <span className="rounded-full bg-white/[0.04] px-3 py-1 text-zinc-300">{pageName}</span>
      </div>

      <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Application menu" aria-expanded={menuOpen} className="no-drag ml-auto grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/[0.05] hover:text-white">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menuOpen && (
        <div className="no-drag absolute right-32 top-10 z-50 w-44 rounded-xl border border-white/10 bg-[#202329] p-1 text-xs shadow-2xl">
          <button type="button" onClick={() => { navigate("/"); window.dispatchEvent(new Event("atlas:new-task")); setMenuOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left text-zinc-300 hover:bg-white/[0.06]">New code task</button>
          <button type="button" onClick={() => { navigate("/settings"); setMenuOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left text-zinc-300 hover:bg-white/[0.06]">Settings</button>
          <button type="button" onClick={() => { setAboutOpen(true); setMenuOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left text-zinc-300 hover:bg-white/[0.06]">About Atlas</button>
        </div>
      )}

      {isDesktop && (
        <div className="no-drag -mr-5 ml-3 flex h-14 border-l border-white/[0.06]">
          <WindowButton label="Minimize" onClick={() => window.atlasDesktop?.windowControl("minimize")}>
            <Minus className="h-3.5 w-3.5" />
          </WindowButton>
          <WindowButton label="Maximize" onClick={() => window.atlasDesktop?.windowControl("maximize")}>
            <Square className="h-3 w-3" />
          </WindowButton>
          <WindowButton label="Close" danger onClick={() => window.atlasDesktop?.windowControl("close")}>
            <X className="h-3.5 w-3.5" />
          </WindowButton>
        </div>
      )}
      {aboutOpen && (
        <div className="no-drag fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="about-atlas-title">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#181b20] p-6 shadow-2xl">
            <div className="flex items-start"><div><h2 id="about-atlas-title" className="text-lg font-semibold text-white">Atlas</h2><p className="mt-1 text-xs text-zinc-500">Local intelligence workspace · 0.1.0</p></div><button type="button" onClick={() => setAboutOpen(false)} className="ml-auto text-zinc-500 hover:text-white" aria-label="Close about dialog"><X className="h-4 w-4" /></button></div>
            <p className="mt-5 text-sm leading-6 text-zinc-400">Built for grounded research, code assistance, general chat, projects, images, and community extensions. Provider connections are managed in Settings.</p>
            <button type="button" onClick={() => setAboutOpen(false)} className="atlas-accent-bg mt-6 w-full rounded-lg py-2 text-sm font-medium text-white">Done</button>
          </div>
        </div>
      )}
    </header>
  );
}

function WindowButton({ label, danger = false, onClick, children }: { label: string; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid w-11 place-items-center transition ${danger ? "text-zinc-500 hover:bg-red-500/80 hover:text-white" : "text-zinc-500 hover:bg-white/[0.06] hover:text-white"}`}
    >
      {children}
    </button>
  );
}
