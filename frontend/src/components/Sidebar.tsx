import { BookOpenText, ChevronLeft, Code2, FolderKanban, Images, MessageCircle, Plus, Puzzle, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { useUiStore } from "../stores/ui";
import { navigate } from "../lib/router";
import { AtlasMark } from "./AtlasMark";
import { NavLink } from "./NavLink";

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const navigation: NavItem[] = [
  { label: "Code Agent", path: "/", icon: Code2 },
  { label: "Chat", path: "/chat", icon: MessageCircle },
  { label: "Projects", path: "/projects", icon: FolderKanban },
  { label: "Research", path: "/research", icon: BookOpenText },
  { label: "Images", path: "/images", icon: Images },
  { label: "Extensions", path: "/extensions", icon: Puzzle },
  { label: "Settings", path: "/settings", icon: Settings },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const [provider, setProvider] = useState<AtlasProviderKind>("demo");

  useEffect(() => {
    const refreshProvider = () => void window.atlasDesktop?.getProvider().then((state) => setProvider(state.config.provider)).catch(() => undefined);
    refreshProvider();
    window.addEventListener("atlas:provider-changed", refreshProvider);
    return () => window.removeEventListener("atlas:provider-changed", refreshProvider);
  }, []);

  return (
    <aside
      className={`relative z-20 hidden shrink-0 flex-col border-r border-white/[0.06] bg-[#111318] transition-[width] duration-200 md:flex ${
        sidebarCollapsed ? "w-[78px]" : "w-[268px]"
      }`}
    >
      <div className={`flex h-[76px] items-center ${sidebarCollapsed ? "justify-center" : "px-5"}`}>
        <AtlasMark compact={sidebarCollapsed} />
      </div>

      <button
        type="button"
        onClick={() => {
          navigate("/");
          window.dispatchEvent(new Event("atlas:new-task"));
        }}
        className={`atlas-primary-action mx-3 mt-1 flex h-11 items-center rounded-full text-sm font-medium transition hover:brightness-110 ${
          sidebarCollapsed ? "justify-center px-0" : "px-3"
        }`}
      >
        <Plus className="h-4 w-4 shrink-0" />
        {!sidebarCollapsed && <span className="ml-2">New task</span>}
      </button>

      <nav className="mt-6 flex flex-1 flex-col gap-1.5 px-3" aria-label="Primary navigation">
        {navigation.map((item) => (
          <NavEntry key={item.path} item={item} compact={sidebarCollapsed} />
        ))}
      </nav>

      {!sidebarCollapsed && (
        <div className="m-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> {providerName(provider)} ready
          </div>
          <p className="mt-1.5 text-[11px] leading-4 text-zinc-500">Change or test it in Settings</p>
        </div>
      )}

      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
        className="absolute -right-3 top-[88px] z-10 grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-[#24291f] text-zinc-500 shadow-md hover:text-white"
      >
        <ChevronLeft className={`h-3 w-3 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
      </button>
    </aside>
  );
}

function providerName(provider: AtlasProviderKind) {
  return { atlas: "Atlas Native", demo: "Local Demo", openai: "OpenAI", compatible: "Compatible API", ollama: "Legacy Ollama" }[provider];
}

function NavEntry({ item, compact }: { item: NavItem; compact: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.path === "/"}
      title={compact ? item.label : undefined}
      className={({ isActive }) =>
        `atlas-nav-item flex h-11 items-center rounded-xl text-sm transition ${compact ? "justify-center px-0" : "px-3.5"} ${
          isActive
            ? "atlas-accent-soft"
            : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100"
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
      {!compact && <span className="ml-3">{item.label}</span>}
    </NavLink>
  );
}
