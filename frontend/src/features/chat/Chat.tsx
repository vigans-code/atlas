import { AnimatePresence, motion } from "framer-motion";
import { Archive, Brain, Copy, GitBranch, Lightbulb, MessageCircle, Mic, MoreHorizontal, Pin, Plus, RefreshCw, Trash2, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AtlasAtom } from "../../components/AtlasAtom";
import { AtlasComposer, type AtlasComposerTool } from "../../components/AtlasComposer";
import { navigate } from "../../lib/router";
import { useChatStore } from "../../stores/chats";
import { useFileStore } from "../../stores/files";
import { useLauncherStore } from "../../stores/launcher";

const prompts = [
  "Help me brainstorm an idea",
  "Explain a difficult concept simply",
  "Improve something I wrote",
  "Make a step-by-step plan",
];

export function Chat() {
  const { chats, activeChatId, createChat, ensureChat, addMessage, updateMessage, renameChat, removeChat, togglePinned, toggleArchived, branchChat } = useChatStore();
  const libraryFiles = useFileStore((state) => state.files);
  const addLibraryFiles = useFileStore((state) => state.addFiles);
  const takeDraft = useLauncherStore((state) => state.takeDraft);
  const takeAttachmentIds = useLauncherStore((state) => state.takeAttachmentIds);
  const setLaunchDraft = useLauncherStore((state) => state.setDraft);
  const sendFilesTo = useLauncherStore((state) => state.sendFilesTo);
  const [draft, setDraft] = useState("");
  const [pendingChatIds, setPendingChatIds] = useState<string[]>([]);
  const [streamingByChat, setStreamingByChat] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<AtlasSelectedFile[]>([]);
  const [providerLabel, setProviderLabel] = useState("Atlas Native");
  const [listening, setListening] = useState(false);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const requestChats = useRef(new Map<string, string>());
  const chatRequests = useRef(new Map<string, string>());
  const streamTextRef = useRef<Record<string, string>>({});
  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? null;
  const messages = activeChat?.messages ?? [];
  const thinking = Boolean(activeChatId && pendingChatIds.includes(activeChatId));
  const streamingText = activeChatId ? streamingByChat[activeChatId] ?? "" : "";

  useEffect(() => {
    ensureChat();
  }, [ensureChat]);

  useEffect(() => {
    const launchedDraft = takeDraft("chat");
    const launchedIds = takeAttachmentIds("chat");
    if (launchedDraft) setDraft(launchedDraft);
    if (launchedIds.length) setAttachments(libraryFiles.filter((file) => launchedIds.includes(file.id)));
  }, [libraryFiles, takeAttachmentIds, takeDraft]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streamingText, thinking]);

  useEffect(() => {
    void window.atlasDesktop?.getProvider().then((state) => setProviderLabel(providerName(state.config.provider))).catch(() => undefined);
  }, []);

  useEffect(() => window.atlasDesktop?.onProviderChatChunk(({ requestId, chunk }) => {
    const chatId = requestChats.current.get(requestId);
    if (!chatId) return;
    const nextText = `${streamTextRef.current[chatId] ?? ""}${chunk}`.slice(0, 16_000);
    streamTextRef.current[chatId] = nextText;
    setStreamingByChat((current) => ({ ...current, [chatId]: nextText }));
  }), []);

  const send = async (text: string) => {
    const prompt = text.trim();
    const chatId = activeChat?.id ?? ensureChat();
    if (!prompt || pendingChatIds.includes(chatId)) return;
    const history = activeChat?.messages ?? [];
    const requestId = crypto.randomUUID();
    requestChats.current.set(requestId, chatId);
    chatRequests.current.set(chatId, requestId);
    addMessage(chatId, { role: "user", content: prompt });
    setDraft("");
    setPendingChatIds((current) => [...current, chatId]);
    const attachmentIds = attachments.map((file) => file.id);
    setAttachments([]);
    try {
      if (!window.atlasDesktop) throw new Error("Atlas Native is available in the Atlas desktop app.");
      const content = await window.atlasDesktop.providerChat({
          mode: "chat",
          messages: [...history, { id: "request", role: "user" as const, content: prompt, createdAt: "" }]
            .slice(-12)
            .map(({ role, content: messageContent }) => ({ role, content: messageContent })),
          attachmentIds,
          requestId,
        });
      addMessage(chatId, { role: "assistant", content });
    } catch (error) {
      const message = cleanError(error);
      const partial = streamTextRef.current[chatId]?.trim();
      if (message.includes("Generation stopped")) {
        if (partial) addMessage(chatId, { role: "assistant", content: `${partial}\n\n[Paused]` });
      } else {
        addMessage(chatId, { role: "assistant", content: providerError(error) });
      }
    } finally {
      requestChats.current.delete(requestId);
      chatRequests.current.delete(chatId);
      delete streamTextRef.current[chatId];
      setStreamingByChat((current) => {
        const next = { ...current };
        delete next[chatId];
        return next;
      });
      setPendingChatIds((current) => current.filter((id) => id !== chatId));
    }
  };

  const submit = (value: string, tool: AtlasComposerTool) => {
    if (tool === "auto") {
      void send(value);
      return;
    }
    const target = tool === "image" ? "image" : tool === "code" ? "code" : "search";
    setLaunchDraft(target, value);
    if (attachments.length) sendFilesTo(target, attachments.map((file) => file.id));
    setAttachments([]);
    navigate(`/${target}`);
  };

  const selectFiles = async () => {
    if (!window.atlasDesktop) return;
    const selected = await window.atlasDesktop.selectFiles();
    addLibraryFiles(selected);
    setAttachments((current) => [...current, ...selected].slice(0, 20));
  };

  const newChat = () => {
    createChat();
    setDraft("");
    setAttachments([]);
  };

  const pauseResponse = async () => {
    if (!activeChatId || !window.atlasDesktop) return;
    const requestId = chatRequests.current.get(activeChatId);
    if (requestId) await window.atlasDesktop.cancelProviderChat(requestId);
  };

  const deleteActiveChat = () => {
    if (!activeChat || !window.confirm(`Delete “${activeChat.title}”?`)) return;
    removeChat(activeChat.id);
    createChat();
    setChatMenuOpen(false);
  };

  const renameActiveChat = () => {
    if (!activeChat) return;
    const title = window.prompt("Rename conversation", activeChat.title);
    if (title?.trim()) renameChat(activeChat.id, title);
    setChatMenuOpen(false);
  };

  const retryResponse = async (messageId: string) => {
    if (!activeChat || thinking) return;
    const index = activeChat.messages.findIndex((message) => message.id === messageId);
    const history = activeChat.messages.slice(0, index);
    if (!history.some((message) => message.role === "user")) return;
    setPendingChatIds((current) => [...current, activeChat.id]);
    try {
      const content = window.atlasDesktop ? await window.atlasDesktop.providerChat({ mode: "chat", messages: history.slice(-12).map(({ role, content }) => ({ role, content })) }) : "Retry is available in the Atlas desktop app.";
      updateMessage(activeChat.id, messageId, content);
    } catch (error) {
      updateMessage(activeChat.id, messageId, providerError(error));
    } finally {
      setPendingChatIds((current) => current.filter((id) => id !== activeChat.id));
    }
  };

  const createBranch = (messageId: string) => {
    if (!activeChat) return;
    branchChat(activeChat.id, messageId);
    setDraft("");
    setAttachments([]);
  };

  const toggleDictation = async () => {
    if (!window.atlasDesktop) return;
    if (listening) {
      await window.atlasDesktop.stopDictation();
      setListening(false);
      return;
    }
    setListening(true);
    setDictationError(null);
    try {
      const result = await window.atlasDesktop.startDictation();
      if (!result.cancelled && result.text.trim()) {
        setDraft((current) => `${current}${current.trim() ? " " : ""}${result.text.trim()}`);
      }
    } catch (error) {
      setDictationError(cleanError(error));
    } finally {
      setListening(false);
    }
  };

  return (
    <div className="atlas-page flex h-full">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex h-14 shrink-0 items-center border-b border-[var(--atlas-border)] px-5 sm:px-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-medium text-zinc-200">{activeChat?.title ?? "Chat"}</h1>
              <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300/80">{providerLabel}</span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">{activeChat?.parentChatId ? "Branched conversation · original unchanged" : "Saved automatically on this device"}</p>
          </div>
          <button type="button" onClick={newChat} className="atlas-secondary-button ml-auto"><Plus className="h-3.5 w-3.5" /> New chat</button>
          <button type="button" onClick={() => setChatMenuOpen((value) => !value)} aria-label="Conversation options" className="atlas-icon-button ml-1"><MoreHorizontal className="h-4 w-4" /></button>
          {chatMenuOpen && <div className="absolute right-5 top-12 z-20 w-44 rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-popover)] p-1.5 shadow-2xl"><button type="button" onClick={renameActiveChat} className="w-full rounded-lg px-3 py-2 text-left text-xs text-[var(--atlas-muted)] hover:bg-[var(--atlas-hover)]">Rename</button><button type="button" onClick={() => { if (activeChat) togglePinned(activeChat.id); setChatMenuOpen(false); }} className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-[var(--atlas-muted)] hover:bg-[var(--atlas-hover)]"><Pin className="mr-2 h-3.5 w-3.5" />{activeChat?.pinned ? "Unpin" : "Pin"}</button><button type="button" onClick={() => { if (activeChat) toggleArchived(activeChat.id); setChatMenuOpen(false); }} className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-[var(--atlas-muted)] hover:bg-[var(--atlas-hover)]"><Archive className="mr-2 h-3.5 w-3.5" />{activeChat?.archived ? "Unarchive" : "Archive"}</button><button type="button" onClick={deleteActiveChat} className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10"><Trash2 className="mr-2 h-3.5 w-3.5" />Delete</button></div>}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-8">
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center py-6">
              <div className="atlas-eyebrow flex items-center gap-2"><MessageCircle className="h-3.5 w-3.5" /> Private conversation / 01</div>
              <h2 className="atlas-hero-title mt-6">What’s on your mind?</h2>
              <p className="mt-5 max-w-xl text-sm leading-6 text-zinc-500">A focused space for questions, writing, and ideas. Every conversation stays on this device.</p>
              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {prompts.map((suggestion, index) => (
                  <button key={suggestion} type="button" onClick={() => void send(suggestion)} className="atlas-catalog-card flex items-end rounded-2xl border p-5 text-left text-sm text-zinc-300 transition">
                    <span className="mr-4 text-[10px] text-zinc-600">0{index + 1}</span>{index % 2 === 0 ? <Lightbulb className="mr-3 h-4 w-4 text-fuchsia-400" /> : <Brain className="mr-3 h-4 w-4 text-indigo-400" />}{suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-8" aria-live="polite">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.article key={message.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
                    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${message.role === "assistant" ? "bg-[var(--atlas-accent)] text-white" : "bg-zinc-800 text-zinc-400"}`}>{message.role === "assistant" ? <AtlasAtom size={19} /> : <User className="h-3.5 w-3.5" />}</div>
                    <div className="group min-w-0 flex-1 pt-1"><div className="mb-2 text-xs font-medium text-zinc-400">{message.role === "assistant" ? "Atlas" : "You"}</div><p className="whitespace-pre-wrap text-sm leading-7 text-zinc-300">{message.content}</p><div className="mt-2 flex min-h-7 items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"><button type="button" onClick={() => void navigator.clipboard.writeText(message.content)} className="atlas-icon-button" aria-label="Copy message"><Copy className="h-3.5 w-3.5" /></button>{message.role === "assistant" ? <button type="button" onClick={() => void retryResponse(message.id)} className="atlas-icon-button" aria-label="Regenerate response"><RefreshCw className="h-3.5 w-3.5" /></button> : <button type="button" onClick={() => { const edited=window.prompt("Edit message",message.content); if(edited?.trim()&&activeChat)updateMessage(activeChat.id,message.id,edited); }} className="px-2 py-1 text-[11px] text-[var(--atlas-subtle)] hover:text-[var(--atlas-text)]">Edit</button>}<button type="button" onClick={() => createBranch(message.id)} className="atlas-icon-button" aria-label="Branch conversation from here" title="Branch from here"><GitBranch className="h-3.5 w-3.5" /></button></div></div>
                  </motion.article>
                ))}
              </AnimatePresence>
              {streamingText ? <StreamingMessage content={streamingText} /> : thinking && <div className="flex items-center gap-2 pl-12 text-xs text-zinc-600"><AtlasAtom size={17} className="atlas-atom-loader text-[var(--atlas-accent)]" /> Atlas is thinking…</div>}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 pb-6 pt-3 sm:px-8">
          <div className="mx-auto max-w-3xl"><AtlasComposer value={draft} onChange={setDraft} onSubmit={submit} attachments={attachments} onPickFiles={() => void selectFiles()} onOpenLibrary={() => navigate("/files")} onRemoveAttachment={(id) => setAttachments((current) => current.filter((item) => item.id !== id))} onError={setDictationError} busy={thinking} onStop={() => void pauseResponse()} placeholder="Message Atlas..." secondaryActions={<button type="button" onClick={() => void toggleDictation()} aria-label={listening ? "Stop dictation" : "Start dictation"} aria-pressed={listening} className={`atlas-icon-button ${listening ? "bg-rose-500/15 text-rose-300" : ""}`}><Mic className={`h-4 w-4 ${listening ? "animate-pulse" : ""}`} /></button>} /></div>
          {dictationError && <p role="alert" className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-rose-300/70">{dictationError}</p>}
        </div>
      </section>

    </div>
  );
}

function providerName(provider: AtlasProviderKind) {
  return provider === "atlas" ? "Atlas Native" : "Atlas Native";
}

function providerError(error: unknown) {
  const message = cleanError(error);
  return `I couldn't complete that request: ${message}\n\nCheck the provider connection in Settings and try again.`;
}

function cleanError(error: unknown) {
  return error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': Error: /, "") : "Unknown error";
}

function StreamingMessage({ content }: { content: string }) {
  return <div className="flex gap-4"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--atlas-accent)] text-white"><AtlasAtom size={19} /></div><div className="min-w-0 flex-1 pt-1"><div className="mb-2 text-xs font-medium text-zinc-400">Atlas</div><p className="whitespace-pre-line text-sm leading-7 text-zinc-300">{content}<span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-indigo-400 align-middle" /></p></div></div>;
}
