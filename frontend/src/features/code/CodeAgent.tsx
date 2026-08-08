import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Braces,
  Bug,
  CheckCircle2,
  Code2,
  FileCode2,
  FolderOpen,
  GitBranch,
  Paperclip,
  Plus,
  Sparkles,
  Terminal,
  User,
  WandSparkles,
  X,
} from "lucide-react";
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";

import { useUiStore } from "../../stores/ui";
import { useProjectStore } from "../../stores/projects";
import { navigate } from "../../lib/router";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

const suggestions = [
  { icon: Bug, title: "Debug an error", prompt: "Help me debug an error in my project." },
  { icon: FileCode2, title: "Build a feature", prompt: "Help me plan and build a new feature." },
  { icon: Braces, title: "Explain code", prompt: "Explain how a section of code works." },
  { icon: CheckCircle2, title: "Review changes", prompt: "Review my code changes for bugs and maintainability." },
];

export function CodeAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [attachments, setAttachments] = useState<AtlasSelectedFile[]>([]);
  const [providerLabel, setProviderLabel] = useState("Local Demo");
  const nextId = useRef(1);
  const taskId = useRef(0);
  const showAgentContext = useUiStore((state) => state.showAgentContext);
  const { projects, activeProjectId } = useProjectStore();
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null;

  const send = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || thinking) return;
    const requestTaskId = taskId.current;
    const userMessage: Message = { id: nextId.current++, role: "user", content: prompt };
    const conversation = [...messages, userMessage];
    setMessages(conversation);
    setDraft("");
    setThinking(true);
    const attachmentIds = attachments.map((file) => file.id);
    setAttachments([]);
    try {
      const content = window.atlasDesktop
        ? await window.atlasDesktop.providerChat({
          mode: "code",
          messages: conversation.map(({ role, content }) => ({ role, content })),
          attachmentIds,
        })
        : localCodeReply(prompt);
      if (requestTaskId === taskId.current) {
        setMessages((current) => [...current, { id: nextId.current++, role: "assistant", content }]);
      }
    } catch (error) {
      if (requestTaskId === taskId.current) {
        setMessages((current) => [...current, { id: nextId.current++, role: "assistant", content: providerError(error) }]);
      }
    } finally {
      if (requestTaskId === taskId.current) setThinking(false);
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

  const newTask = () => {
    taskId.current += 1;
    setMessages([]);
    setDraft("");
    setThinking(false);
    setAttachments([]);
  };

  useEffect(() => {
    window.addEventListener("atlas:new-task", newTask);
    return () => window.removeEventListener("atlas:new-task", newTask);
  });

  useEffect(() => {
    void window.atlasDesktop?.getProvider().then((state) => setProviderLabel(providerName(state.config.provider))).catch(() => undefined);
  }, []);

  const selectFiles = async () => {
    if (!window.atlasDesktop) return;
    const selected = await window.atlasDesktop.selectFiles();
    setAttachments((current) => [...current, ...selected].slice(0, 20));
  };

  return (
    <div className="atlas-page flex h-full">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center border-b border-white/[0.05] px-5 sm:px-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-medium text-zinc-200">Code Agent</h1>
              <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300/80">{providerLabel}</span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">Build, debug, and understand code with Atlas</p>
          </div>
          <button
            type="button"
            onClick={newTask}
            className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-xs text-zinc-300 hover:bg-white/[0.07]"
          >
            <Plus className="h-3.5 w-3.5" /> New task
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-8">
          {messages.length === 0 ? (
            <Welcome onSelect={send} />
          ) : (
            <div className="mx-auto max-w-3xl space-y-8" aria-live="polite">
              <AnimatePresence initial={false}>
                {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
              </AnimatePresence>
              {thinking && <Thinking />}
            </div>
          )}
        </div>

        <form onSubmit={submit} className="shrink-0 px-5 pb-6 pt-3 sm:px-8">
          <div className="atlas-composer mx-auto max-w-3xl rounded-2xl border p-2">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 border-b border-white/[0.06] px-2 pb-2">
                {attachments.map((file) => <span key={file.id} className="flex items-center rounded-lg bg-white/[0.05] px-2 py-1 text-[11px] text-zinc-400"><FileCode2 className="mr-1.5 h-3 w-3" />{file.name}<button type="button" onClick={() => setAttachments((current) => current.filter((item) => item.id !== file.id))} className="ml-1.5 text-zinc-600 hover:text-white" aria-label={`Remove ${file.name}`}><X className="h-3 w-3" /></button></span>)}
              </div>
            )}
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              placeholder="Ask Atlas to build, debug, explain, or review code…"
              aria-label="Message Code Agent"
              className="max-h-40 min-h-14 w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />
            <div className="flex items-center px-1 pb-1">
              <button type="button" onClick={() => void selectFiles()} aria-label="Attach context" className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/[0.05] hover:text-white">
                <Paperclip className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => navigate("/projects")} className="ml-1 flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-zinc-500 hover:bg-white/[0.05] hover:text-white">
                <FolderOpen className="h-3.5 w-3.5" /> {activeProject ? activeProject.name : "Add project"}
              </button>
              <button
                type="submit"
                disabled={!draft.trim() || thinking}
                aria-label="Send task"
                className="atlas-accent-bg ml-auto grid h-8 w-8 place-items-center rounded-lg text-white transition enabled:hover:brightness-110 disabled:bg-zinc-700 disabled:text-zinc-500"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-zinc-600">Review generated code before running it.</p>
        </form>
      </section>

      {showAgentContext && <aside className="hidden w-72 shrink-0 border-l border-white/[0.06] bg-[#111318] p-4 xl:block">
        <h2 className="text-xs font-medium text-zinc-300">Agent context</h2>
        <div className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-center">
          <FolderOpen className="mx-auto h-5 w-5 text-zinc-600" />
          <p className="mt-2 text-xs text-zinc-400">{activeProject?.name ?? "No project selected"}</p>
          <p className="mt-1 break-all text-[11px] leading-4 text-zinc-600">{activeProject?.path ?? "Open a project to give the agent file context."}</p>
        </div>
        <h3 className="mt-7 text-[11px] font-medium uppercase tracking-wide text-zinc-600">Available after setup</h3>
        <div className="mt-3 space-y-2">
          <AgentTool icon={FileCode2} label="Read and edit files" />
          <AgentTool icon={Terminal} label="Run commands" />
          <AgentTool icon={GitBranch} label="Review changes" />
        </div>
      </aside>}
    </div>
  );
}

function Welcome({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center py-6">
      <div className="atlas-eyebrow flex items-center gap-2"><Code2 className="h-3.5 w-3.5" /> Development studio / 01</div>
      <h2 className="atlas-hero-title mt-6">What should we build?</h2>
      <p className="mt-5 max-w-xl text-sm leading-6 text-zinc-500">Move from a rough idea to working code with a calm, focused local workspace.</p>
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {suggestions.map((item) => (
          <button key={item.title} type="button" onClick={() => onSelect(item.prompt)} className="atlas-catalog-card rounded-2xl border p-5 text-left transition">
            <item.icon className="h-4 w-4 text-indigo-400" />
            <div className="mt-3 text-sm font-medium text-zinc-200">{item.title}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const assistant = message.role === "assistant";
  return (
    <motion.article initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${assistant ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white" : "bg-zinc-800 text-zinc-400"}`}>
        {assistant ? <WandSparkles className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
      </div>
      <div className="min-w-0 flex-1 pt-1">
        <div className="mb-2 text-xs font-medium text-zinc-400">{assistant ? "Atlas" : "You"}</div>
        <p className="whitespace-pre-line text-sm leading-7 text-zinc-300">{message.content}</p>
      </div>
    </motion.article>
  );
}

function Thinking() {
  return (
    <div className="flex gap-4" aria-label="Atlas is thinking">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white"><Sparkles className="h-3.5 w-3.5" /></div>
      <div className="flex items-center gap-1.5">{[0, 1, 2].map((item) => <motion.span key={item} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.1, repeat: Infinity, delay: item * 0.15 }} className="h-1.5 w-1.5 rounded-full bg-zinc-500" />)}</div>
    </div>
  );
}

function AgentTool({ icon: Icon, label }: { icon: typeof FileCode2; label: string }) {
  return <div className="flex items-center rounded-lg px-2 py-2 text-xs text-zinc-500"><Icon className="mr-2.5 h-3.5 w-3.5 text-zinc-600" />{label}</div>;
}

function localCodeReply(prompt: string) {
  const normalized = prompt.toLowerCase();
  if (normalized.includes("debug") || normalized.includes("error")) {
    return "Paste the error message, the relevant code, and what you expected to happen. I’ll help narrow it down by separating the observed behavior, likely causes, and the smallest safe fix.\n\nA generative coding model is not connected yet, so this desktop build is currently limited to guided responses.";
  }
  if (normalized.includes("review")) {
    return "Add a project or paste the changed code. A useful review will check correctness, error handling, security boundaries, maintainability, tests, and unintended behavior.\n\nConnect a coding model in Settings to enable full code review responses.";
  }
  if (normalized.includes("explain")) {
    return "Paste the code you want explained. I can break it down by purpose, data flow, important functions, dependencies, and potential edge cases once a coding model is connected.";
  }
  return "Your coding task is ready, but Atlas does not have a model provider connected yet. Open Settings to configure a coding model. Provider credentials should be stored by the backend or operating-system credential store, never directly in the renderer.";
}

function providerName(provider: AtlasProviderKind) {
  return { atlas: "Atlas Native", demo: "Local Demo", openai: "OpenAI", compatible: "Compatible API", ollama: "Legacy Ollama" }[provider];
}

function providerError(error: unknown) {
  const message = error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': Error: /, "") : "Unknown provider error";
  return `I couldn't complete that request: ${message}\n\nCheck the provider connection in Settings and try again.`;
}
