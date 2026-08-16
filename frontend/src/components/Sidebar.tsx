import { BookOpen, Braces, ChevronLeft, Clock3, FileStack, FolderKanban, Home, Image, MessageSquare, Plus, Search, Settings, Upload, UserRound, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { navigate } from "../lib/router";
import { useActivityStore } from "../stores/activity";
import { useChatStore } from "../stores/chats";
import { useFileStore } from "../stores/files";
import { useUiStore } from "../stores/ui";
import { AtlasMark } from "./AtlasMark";
import { NavLink } from "./NavLink";

interface NavItem { label: string; path: string; icon: LucideIcon }

const navigation: NavItem[] = [
  { label: "Home", path: "/", icon: Home },
  { label: "Chat", path: "/chat", icon: MessageSquare },
  { label: "Image", path: "/image", icon: Image },
  { label: "Code", path: "/code", icon: Braces },
  { label: "Search", path: "/search", icon: Search },
  { label: "Projects", path: "/projects", icon: FolderKanban },
  { label: "Library", path: "/files", icon: FileStack },
];

export function Sidebar() {
  const { sidebarCollapsed, mobileSidebarOpen, toggleSidebar, setMobileSidebarOpen } = useUiStore();

  return <>
    {mobileSidebarOpen && <button type="button" aria-label="Close navigation" onClick={() => setMobileSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm md:hidden" />}
    <aside onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setMobileSidebarOpen(false); }} className={`atlas-sidebar fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-[var(--atlas-border)] transition-[width,transform] duration-200 md:relative md:translate-x-0 ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"} ${sidebarCollapsed ? "w-[76px]" : "w-[260px]"}`}>
      <div className={`flex h-[70px] shrink-0 items-center ${sidebarCollapsed ? "justify-center" : "px-4"}`}><AtlasMark compact={sidebarCollapsed} /><button type="button" onClick={() => setMobileSidebarOpen(false)} aria-label="Close navigation" className="atlas-icon-button ml-auto md:hidden"><X className="h-4 w-4" /></button></div>
      <NewMenu compact={sidebarCollapsed} />
      <nav className="mt-4 flex flex-col gap-0.5 px-2.5" aria-label="Primary navigation">{navigation.map((item) => <NavEntry key={item.path} item={item} compact={sidebarCollapsed} />)}</nav>
      {!sidebarCollapsed && <Recent />}
      <div className="mt-auto border-t border-[var(--atlas-border)] p-2.5"><NavEntry item={{ label: "History", path: "/history", icon: Clock3 }} compact={sidebarCollapsed} /><NavEntry item={{ label: "Settings", path: "/settings", icon: Settings }} compact={sidebarCollapsed} /><button type="button" onClick={() => navigate("/settings")} className={`mt-1 flex h-11 w-full items-center rounded-xl text-[var(--atlas-muted)] hover:bg-[var(--atlas-hover)] hover:text-[var(--atlas-text)] ${sidebarCollapsed ? "justify-center" : "px-3"}`}><span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--atlas-elevated)]"><UserRound className="h-3.5 w-3.5" /></span>{!sidebarCollapsed && <span className="ml-2.5 text-sm">Local profile</span>}</button></div>
      <button type="button" onClick={toggleSidebar} aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"} className="absolute -right-3 top-[82px] hidden h-6 w-6 place-items-center rounded-full border border-[var(--atlas-border)] bg-[var(--atlas-panel)] text-[var(--atlas-subtle)] shadow-md hover:text-[var(--atlas-text)] md:grid"><ChevronLeft className={`h-3 w-3 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} /></button>
    </aside>
  </>;
}

function NewMenu({ compact }: { compact: boolean }) {
  const [open, setOpen] = useState(false);
  const { createChat } = useChatStore();
  const addFiles = useFileStore((state) => state.addFiles);
  const choose = (path: string, kind?: "chat") => { if (kind === "chat") createChat(); navigate(path); setOpen(false); };
  const upload = async () => {
    setOpen(false);
    navigate("/files");
    if (!window.atlasDesktop) return;
    const selected = await window.atlasDesktop.selectFiles();
    if (selected.length) addFiles(selected);
  };
  const newProject = () => {
    sessionStorage.setItem("atlas:new-project", "1");
    window.dispatchEvent(new Event("atlas:new-project"));
    choose("/projects");
  };
  return <div className="relative px-2.5"><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className={`atlas-new-button flex h-10 w-full items-center rounded-xl ${compact ? "justify-center" : "px-3"}`}><Plus className="h-4 w-4" />{!compact && <span className="ml-2 text-sm font-medium">New</span>}</button>{open && <div className={`absolute top-12 z-20 w-52 rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-popover)] p-1.5 shadow-2xl ${compact ? "left-[68px]" : "left-2.5"}`} role="menu"><NewItem icon={MessageSquare} label="New chat" onClick={() => choose("/chat", "chat")} /><NewItem icon={Image} label="Image workspace" onClick={() => choose("/image")} /><NewItem icon={Braces} label="New code session" onClick={() => choose("/code")} /><NewItem icon={Search} label="New search" onClick={() => choose("/search")} /><NewItem icon={BookOpen} label="Deep research" onClick={() => choose("/search")} /><div className="my-1 border-t border-[var(--atlas-border)]" /><NewItem icon={FolderKanban} label="New project" onClick={newProject} /><NewItem icon={Upload} label="Upload file" onClick={() => void upload()} /></div>}</div>;
}

function NewItem({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) { return <button type="button" onClick={onClick} role="menuitem" className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm text-[var(--atlas-muted)] hover:bg-[var(--atlas-hover)] hover:text-[var(--atlas-text)]"><Icon className="mr-3 h-4 w-4" />{label}</button>; }

function Recent() {
  const { chats, setActiveChat } = useChatStore();
  const activity = useActivityStore((state) => state.items);
  const recent = useMemo(() => [
    ...chats.filter((chat) => !chat.archived).map((chat) => ({ id: chat.id, title: chat.title, path: "/chat", updatedAt: chat.updatedAt, pinned: Boolean(chat.pinned), chat: true })),
    ...activity.map((item) => ({ ...item, chat: false })),
  ].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)).slice(0, 7), [activity, chats]);
  if (!recent.length) return null;
  return <section className="mt-6 min-h-0 flex-1 overflow-hidden px-2.5"><div className="mb-2 flex items-center px-2 text-[11px] font-medium text-[var(--atlas-subtle)]"><span>Recent</span><button type="button" onClick={() => navigate("/history")} className="ml-auto hover:text-[var(--atlas-text)]">View all</button></div><div className="space-y-0.5 overflow-y-auto">{recent.map((item) => <button key={`${item.chat ? "chat" : "activity"}-${item.id}`} type="button" onClick={() => { if (item.chat) setActiveChat(item.id); navigate(item.path); }} className="block w-full truncate rounded-lg px-2 py-2 text-left text-xs text-[var(--atlas-muted)] hover:bg-[var(--atlas-hover)] hover:text-[var(--atlas-text)]">{item.title}</button>)}</div></section>;
}

function NavEntry({ item, compact }: { item: NavItem; compact: boolean }) {
  const Icon = item.icon;
  return <NavLink to={item.path} end={item.path === "/"} title={compact ? item.label : undefined} className={({ isActive }) => `atlas-nav-link flex h-10 items-center rounded-xl text-sm transition ${compact ? "justify-center" : "px-3"} ${isActive ? "bg-[var(--atlas-elevated)] text-[var(--atlas-text)]" : "text-[var(--atlas-muted)] hover:bg-[var(--atlas-hover)] hover:text-[var(--atlas-text)]"}`}><Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />{!compact && <span className="ml-3">{item.label}</span>}</NavLink>;
}
