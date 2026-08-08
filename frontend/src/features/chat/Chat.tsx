import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Brain, File, History, Lightbulb, MessageCircle, Mic, Paperclip, Pause, Plus, Sparkles, User, X } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";

import { useChatStore } from "../../stores/chats";

const prompts = [
  "Help me brainstorm an idea",
  "Explain a difficult concept simply",
  "Improve something I wrote",
  "Make a step-by-step plan",
];

export function Chat() {
  const { chats, activeChatId, createChat, ensureChat, setActiveChat, addMessage } = useChatStore();
  const [draft, setDraft] = useState("");
  const [pendingChatIds, setPendingChatIds] = useState<string[]>([]);
  const [streamingByChat, setStreamingByChat] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<AtlasSelectedFile[]>([]);
  const [providerLabel, setProviderLabel] = useState("Local Demo");
  const [listening, setListening] = useState(false);
  const [dictationError, setDictationError] = useState<string | null>(null);
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
      const content = window.atlasDesktop
        ? await window.atlasDesktop.providerChat({
          mode: "chat",
          messages: [...history, { id: "request", role: "user" as const, content: prompt, createdAt: "" }]
            .slice(-12)
            .map(({ role, content: messageContent }) => ({ role, content: messageContent })),
          attachmentIds,
          requestId,
        })
        : `Local Demo received your message:\n\n${prompt}`;
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

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send(draft);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(draft);
    }
  };

  const selectFiles = async () => {
    if (!window.atlasDesktop) return;
    const selected = await window.atlasDesktop.selectFiles();
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
        <header className="flex h-16 shrink-0 items-center border-b border-white/[0.05] px-5 sm:px-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-medium text-zinc-200">{activeChat?.title ?? "Chat"}</h1>
              <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300/80">{providerLabel}</span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">Saved automatically on this device</p>
          </div>
          <button type="button" onClick={newChat} className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-xs text-zinc-300 hover:bg-white/[0.07]"><Plus className="h-3.5 w-3.5" /> New chat</button>
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
                    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${message.role === "assistant" ? "bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-white" : "bg-zinc-800 text-zinc-400"}`}>{message.role === "assistant" ? <Sparkles className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}</div>
                    <div className="min-w-0 flex-1 pt-1"><div className="mb-2 text-xs font-medium text-zinc-400">{message.role === "assistant" ? "Atlas" : "You"}</div><p className="whitespace-pre-line text-sm leading-7 text-zinc-300">{message.content}</p></div>
                  </motion.article>
                ))}
              </AnimatePresence>
              {streamingText ? <StreamingMessage content={streamingText} /> : thinking && <div className="flex items-center gap-2 pl-12 text-xs text-zinc-600"><Sparkles className="h-3.5 w-3.5 animate-pulse" /> Atlas is thinking…</div>}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <form onSubmit={submit} className="shrink-0 px-5 pb-6 pt-3 sm:px-8">
          <div className="atlas-composer mx-auto max-w-3xl rounded-2xl border p-2">
            {attachments.length > 0 && <div className="flex flex-wrap gap-2 border-b border-white/[0.06] px-2 pb-2">{attachments.map((file) => <span key={file.id} className="flex items-center rounded-lg bg-white/[0.05] px-2 py-1 text-[11px] text-zinc-400"><File className="mr-1.5 h-3 w-3" />{file.name}<button type="button" onClick={() => setAttachments((current) => current.filter((item) => item.id !== file.id))} className="ml-1.5 text-zinc-600 hover:text-white" aria-label={`Remove ${file.name}`}><X className="h-3 w-3" /></button></span>)}</div>}
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown} rows={2} placeholder="Message Atlas…" aria-label="Message Atlas" className="max-h-40 min-h-14 w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-zinc-100 placeholder:text-zinc-600 focus:outline-none" />
            <div className="flex items-center px-1 pb-1">
              <button type="button" onClick={() => void selectFiles()} aria-label="Attach a file" className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/[0.05] hover:text-white"><Paperclip className="h-4 w-4" /></button>
              <button type="button" onClick={() => void toggleDictation()} aria-label={listening ? "Stop dictation" : "Start dictation"} aria-pressed={listening} className={`ml-1 grid h-8 w-8 place-items-center rounded-lg transition ${listening ? "bg-rose-500/15 text-rose-300" : "text-zinc-500 hover:bg-white/[0.05] hover:text-white"}`}><Mic className={`h-4 w-4 ${listening ? "animate-pulse" : ""}`} /></button>
              {thinking ? <button type="button" onClick={() => void pauseResponse()} aria-label="Pause response" className="ml-auto grid h-8 w-8 place-items-center rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"><Pause className="h-4 w-4" /></button> : <button type="submit" disabled={!draft.trim()} aria-label="Send message" className="ml-auto grid h-8 w-8 place-items-center rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 disabled:bg-zinc-700 disabled:text-zinc-500"><ArrowUp className="h-4 w-4" /></button>}
            </div>
          </div>
          {dictationError && <p role="alert" className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-rose-300/70">{dictationError}</p>}
        </form>
      </section>

      <aside className="hidden w-64 shrink-0 border-l border-white/[0.06] bg-[#111318] p-3 lg:flex lg:flex-col">
        <div className="flex items-center px-2 py-2 text-xs font-medium text-zinc-400"><History className="mr-2 h-3.5 w-3.5" /> Saved chats<span className="ml-auto text-[10px] text-zinc-700">{chats.length}</span></div>
        <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {chats.map((chat) => <button key={chat.id} type="button" onClick={() => setActiveChat(chat.id)} className={`w-full rounded-lg px-3 py-2.5 text-left transition ${chat.id === activeChatId ? "atlas-accent-soft" : "text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300"}`}><span className="block truncate text-xs">{chat.title}</span><span className="mt-1 block text-[10px] opacity-50">{formatChatTime(chat.updatedAt)}</span></button>)}
        </div>
      </aside>
    </div>
  );
}

function providerName(provider: AtlasProviderKind) {
  return { atlas: "Atlas Native", demo: "Local Demo", openai: "OpenAI", compatible: "Compatible API", ollama: "Legacy Ollama" }[provider];
}

function providerError(error: unknown) {
  const message = cleanError(error);
  return `I couldn't complete that request: ${message}\n\nCheck the provider connection in Settings and try again.`;
}

function cleanError(error: unknown) {
  return error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': Error: /, "") : "Unknown error";
}

function formatChatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Saved" : date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function StreamingMessage({ content }: { content: string }) {
  return <div className="flex gap-4"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-white"><Sparkles className="h-3.5 w-3.5" /></div><div className="min-w-0 flex-1 pt-1"><div className="mb-2 text-xs font-medium text-zinc-400">Atlas</div><p className="whitespace-pre-line text-sm leading-7 text-zinc-300">{content}<span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-indigo-400 align-middle" /></p></div></div>;
}
