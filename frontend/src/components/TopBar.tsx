import { Command, Menu, Minus, MoreHorizontal, Square, X } from "lucide-react";
import { useState } from "react";

import { navigate, usePathname } from "../lib/router";
import { useUiStore } from "../stores/ui";

const pageNames: Record<string, string> = { "/": "Atlas", "/chat": "Chat", "/image": "Image", "/code": "Code", "/search": "Search", "/projects": "Projects", "/files": "Library", "/history": "History", "/extensions": "Extensions", "/settings": "Settings" };

export function TopBar() {
  const isDesktop = Boolean(window.atlasDesktop?.isDesktop);
  const pathname = usePathname();
  const setMobileSidebarOpen = useUiStore((state) => state.setMobileSidebarOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  return <header className="titlebar atlas-topbar relative z-30 flex h-12 shrink-0 items-center border-b border-[var(--atlas-border)] px-3 sm:px-4">
    <button type="button" onClick={() => setMobileSidebarOpen(true)} aria-label="Open navigation" className="no-drag atlas-icon-button mr-2 md:hidden"><Menu className="h-4 w-4" /></button>
    <span className="text-sm font-medium text-[var(--atlas-text)]">{pageNames[pathname] ?? "Atlas"}</span>
    <button type="button" onClick={() => window.dispatchEvent(new Event("atlas:command-palette"))} className="no-drag ml-auto hidden h-8 items-center rounded-lg border border-[var(--atlas-border)] px-3 text-[11px] text-[var(--atlas-subtle)] hover:bg-[var(--atlas-hover)] hover:text-[var(--atlas-text)] sm:flex"><Command className="mr-2 h-3.5 w-3.5" />Search or command <kbd className="ml-3 opacity-60">Ctrl K</kbd></button>
    <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Application menu" aria-expanded={menuOpen} className="no-drag atlas-icon-button ml-1"><MoreHorizontal className="h-4 w-4" /></button>
    {menuOpen && <div className="no-drag absolute right-3 top-10 z-50 w-44 rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-popover)] p-1.5 text-xs shadow-2xl"><MenuButton onClick={() => { navigate("/extensions"); setMenuOpen(false); }}>Extensions</MenuButton><MenuButton onClick={() => { navigate("/settings"); setMenuOpen(false); }}>Settings</MenuButton><MenuButton onClick={() => { setAboutOpen(true); setMenuOpen(false); }}>About Atlas</MenuButton></div>}
    {isDesktop && <div className="no-drag -mr-4 ml-2 flex h-12 border-l border-[var(--atlas-border)]"><WindowButton label="Minimize" onClick={() => window.atlasDesktop?.windowControl("minimize")}><Minus className="h-3.5 w-3.5" /></WindowButton><WindowButton label="Maximize" onClick={() => window.atlasDesktop?.windowControl("maximize")}><Square className="h-3 w-3" /></WindowButton><WindowButton label="Close" danger onClick={() => window.atlasDesktop?.windowControl("close")}><X className="h-3.5 w-3.5" /></WindowButton></div>}
    {aboutOpen && <div className="no-drag fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="about-atlas-title"><div className="w-full max-w-sm rounded-2xl border border-[var(--atlas-border)] bg-[var(--atlas-popover)] p-6 shadow-2xl"><div className="flex items-start"><div><h2 id="about-atlas-title" className="text-lg font-semibold text-[var(--atlas-text)]">Atlas</h2><p className="mt-1 text-xs text-[var(--atlas-subtle)]">Unified AI workspace · 0.1.0 developer preview</p></div><button type="button" onClick={() => setAboutOpen(false)} className="atlas-icon-button ml-auto" aria-label="Close about dialog"><X className="h-4 w-4" /></button></div><p className="mt-5 text-sm leading-6 text-[var(--atlas-muted)]">Atlas Native chat, code, files, projects, and public-information research. Image generation is not included in this preview.</p><button type="button" onClick={() => setAboutOpen(false)} className="atlas-primary-button mt-6 w-full justify-center">Done</button></div></div>}
  </header>;
}

function MenuButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className="w-full rounded-lg px-3 py-2 text-left text-[var(--atlas-muted)] hover:bg-[var(--atlas-hover)] hover:text-[var(--atlas-text)]">{children}</button>; }
function WindowButton({ label, danger = false, onClick, children }: { label: string; danger?: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" aria-label={label} onClick={onClick} className={`grid w-11 place-items-center transition ${danger ? "text-[var(--atlas-subtle)] hover:bg-red-500/80 hover:text-white" : "text-[var(--atlas-subtle)] hover:bg-[var(--atlas-hover)] hover:text-[var(--atlas-text)]"}`}>{children}</button>; }
