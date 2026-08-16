import { Braces, Image, MessageSquare, Pin, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { navigate } from "../../lib/router";
import { useActivityStore } from "../../stores/activity";
import { useChatStore } from "../../stores/chats";

type HistoryFilter = "all" | "chat" | "image" | "code" | "search";

export function History() {
  const { chats, setActiveChat, renameChat, removeChat, togglePinned } = useChatStore();
  const activity = useActivityStore();
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [query, setQuery] = useState("");
  const items = useMemo(() => [
    ...chats.map((chat) => ({ id: chat.id, type: "chat" as const, title: chat.title, updatedAt: chat.updatedAt, pinned: Boolean(chat.pinned), archived: Boolean(chat.archived), path: "/chat" })),
    ...activity.items.map((item) => ({ ...item, archived: false })),
  ].filter((item) => (filter === "all" || item.type === filter) && item.title.toLowerCase().includes(query.toLowerCase())).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)), [activity.items, chats, filter, query]);

  const open = (item: (typeof items)[number]) => { if (item.type === "chat") setActiveChat(item.id); navigate(item.path); };
  const rename = (item: (typeof items)[number]) => { const title=window.prompt("Rename item", item.title); if (!title) return; if (item.type === "chat") renameChat(item.id, title); else activity.rename(item.id, title); };
  const remove = (item: (typeof items)[number]) => { if (!window.confirm(`Delete “${item.title}”?`)) return; if (item.type === "chat") removeChat(item.id); else activity.remove(item.id); };
  const pin = (item: (typeof items)[number]) => item.type === "chat" ? togglePinned(item.id) : activity.togglePinned(item.id);

  return <div className="atlas-page h-full overflow-y-auto px-5 py-8 sm:px-8"><main className="mx-auto max-w-4xl"><header><h1 className="atlas-page-title">History</h1><p className="atlas-page-description">Your recent conversations and workspace sessions in one place.</p></header><div className="mt-6 flex flex-col gap-3 sm:flex-row"><label className="flex h-10 flex-1 items-center rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-panel)] px-3"><Search className="mr-2 h-4 w-4 text-[var(--atlas-subtle)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search history" className="min-w-0 flex-1 bg-transparent text-sm text-[var(--atlas-text)] outline-none" /></label><div className="flex gap-1 overflow-x-auto">{(["all","chat","image","code","search"] as HistoryFilter[]).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg px-3 text-xs capitalize ${filter === value ? "bg-[var(--atlas-elevated)] text-[var(--atlas-text)]" : "text-[var(--atlas-muted)] hover:text-[var(--atlas-text)]"}`}>{value}</button>)}</div></div>{items.length ? <div className="mt-6 divide-y divide-[var(--atlas-border)] border-y border-[var(--atlas-border)]">{items.map((item) => { const Icon={chat:MessageSquare,image:Image,code:Braces,search:Search}[item.type]; return <article key={`${item.type}-${item.id}`} className="group flex items-center gap-3 py-3"><button type="button" onClick={() => open(item)} className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--atlas-panel)] text-[var(--atlas-muted)]"><Icon className="h-4 w-4" /></button><button type="button" onClick={() => open(item)} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm text-[var(--atlas-text)]">{item.title}</span><span className="mt-1 block text-xs capitalize text-[var(--atlas-subtle)]">{item.type} · {formatTime(item.updatedAt)}{item.archived ? " · archived" : ""}</span></button><button type="button" onClick={() => pin(item)} aria-label={item.pinned ? "Unpin" : "Pin"} className={`atlas-icon-button ${item.pinned ? "text-[var(--atlas-accent)]" : ""}`}><Pin className="h-3.5 w-3.5" /></button><button type="button" onClick={() => rename(item)} className="atlas-secondary-button">Rename</button><button type="button" onClick={() => remove(item)} aria-label={`Delete ${item.title}`} className="atlas-icon-button hover:text-rose-400"><Trash2 className="h-4 w-4" /></button></article>; })}</div> : <div className="atlas-empty-state mt-8"><Search className="h-5 w-5" /><h2>No history found</h2><p>Start a chat, create an image, work with code, or run a search.</p></div>}</main></div>;
}

function formatTime(value: string) { return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
