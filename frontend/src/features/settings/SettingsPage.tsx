import { Cable, CheckCircle2, Copy, Cpu, Download, KeyRound, LayoutPanelLeft, LockKeyhole, Monitor, Palette, Puzzle, RefreshCw, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { FeatureManager } from "../catalog/FeatureManager";
import { type AccentColor, type FontScale, type InterfaceDensity, useUiStore } from "../../stores/ui";

type SettingsTab = "general" | "providers" | "security" | "features";

const accentOptions: Array<{ value: AccentColor; color: string }> = [
  { value: "indigo", color: "#bc4c26" },
  { value: "violet", color: "#d79c3b" },
  { value: "emerald", color: "#59943f" },
  { value: "rose", color: "#a84735" },
  { value: "orange", color: "#c87536" },
];

export function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("general");

  return (
    <div className="atlas-page h-full overflow-y-auto px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header>
          <div className="atlas-eyebrow mb-3">System preferences / 07</div><h1 className="text-4xl text-white">Settings</h1>
          <p className="mt-2 text-sm text-zinc-500">Customize Atlas and manage its capabilities.</p>
        </header>

        <div className="mt-7 flex gap-1 border-b border-white/[0.07]">
          <TabButton active={tab === "general"} onClick={() => setTab("general")} icon={SlidersHorizontal}>General</TabButton>
          <TabButton active={tab === "providers"} onClick={() => setTab("providers")} icon={KeyRound}>Providers</TabButton>
          <TabButton active={tab === "security"} onClick={() => setTab("security")} icon={ShieldCheck}>Security</TabButton>
          <TabButton active={tab === "features"} onClick={() => setTab("features")} icon={Puzzle}>Feature library</TabButton>
        </div>

        <div className="mt-7">
          {tab === "general" && <GeneralSettings />}
          {tab === "providers" && <ProviderSettings />}
          {tab === "security" && <SecuritySettings />}
          {tab === "features" && <FeatureManager />}
        </div>
      </div>
    </div>
  );
}

function GeneralSettings() {
  const {
    accentColor,
    density,
    fontScale,
    reducedMotion,
    showAgentContext,
    setAccentColor,
    setDensity,
    setFontScale,
    setReducedMotion,
    setShowAgentContext,
  } = useUiStore();

  return (
    <div className="space-y-5">
      <SettingCard icon={Palette} title="Appearance" description="Personalize the desktop interface.">
        <SettingField label="Accent color" description="Used for active controls and highlights.">
          <div className="flex gap-2">
            {accentOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAccentColor(option.value)}
                aria-label={`${option.value} accent`}
                aria-pressed={accentColor === option.value}
                className={`h-7 w-7 rounded-full border-2 transition ${accentColor === option.value ? "border-white scale-110" : "border-transparent"}`}
                style={{ backgroundColor: option.color }}
              />
            ))}
          </div>
        </SettingField>
        <SettingField label="Text size" description="Adjust text across the application.">
          <Segmented value={fontScale} options={["small", "default", "large"]} onChange={(value) => setFontScale(value as FontScale)} />
        </SettingField>
        <SettingField label="Interface density" description="Choose spacing for navigation and controls.">
          <Segmented value={density} options={["compact", "comfortable"]} onChange={(value) => setDensity(value as InterfaceDensity)} />
        </SettingField>
        <SettingField label="Reduced motion" description="Minimize interface animations.">
          <Switch checked={reducedMotion} onChange={setReducedMotion} />
        </SettingField>
      </SettingCard>

      <SettingCard icon={LayoutPanelLeft} title="Code Agent layout" description="Control what appears beside the coding conversation.">
        <SettingField label="Agent context panel" description="Show project tools and workspace status.">
          <Switch checked={showAgentContext} onChange={setShowAgentContext} />
        </SettingField>
      </SettingCard>

      <SettingCard icon={Monitor} title="Application" description="Desktop behavior and local data.">
        <SettingField label="Theme" description="Additional light and system themes can be supplied by extensions.">
          <span className="text-xs text-zinc-400">Dark</span>
        </SettingField>
        <SettingField label="Preferences storage" description="Customization is saved on this device.">
          <span className="text-xs text-emerald-400/80">Local</span>
        </SettingField>
      </SettingCard>
    </div>
  );
}

function ProviderSettings() {
  const [config, setConfig] = useState<AtlasProviderConfig>({ provider: "atlas", model: "atlas-native-v0", chatModel: "atlas-native-v0", imageModel: "not-supported", baseUrl: "http://127.0.0.1:47636", reasoningEffort: "none" });
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [encryptionAvailable, setEncryptionAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!window.atlasDesktop) {
      setStatus({ kind: "error", text: "Provider settings are available in the Atlas desktop app." });
      return;
    }
    void window.atlasDesktop.getProvider()
      .then((state) => {
        setConfig(state.config);
        setHasApiKey(state.hasApiKey);
        setEncryptionAvailable(state.encryptionAvailable);
      })
      .catch((error) => setStatus({ kind: "error", text: cleanError(error) }));
  }, []);

  const chooseProvider = (provider: AtlasProviderKind) => {
    const defaults: Record<AtlasProviderKind, AtlasProviderConfig> = {
      atlas: { provider: "atlas", model: "atlas-native-v0", chatModel: "atlas-native-v0", imageModel: "not-supported", baseUrl: "http://127.0.0.1:47636", reasoningEffort: "none" },
      demo: { provider: "demo", model: "atlas-demo", chatModel: "atlas-demo", imageModel: "atlas-demo-image", baseUrl: "", reasoningEffort: "low" },
      openai: { provider: "openai", model: "gpt-5.6-sol", chatModel: "gpt-5.6-sol", imageModel: "gpt-image-2", baseUrl: "https://api.openai.com/v1", reasoningEffort: "low" },
      compatible: { provider: "compatible", model: "your-code-model", chatModel: "your-chat-model", imageModel: "your-image-model", baseUrl: "https://example.com/v1", reasoningEffort: "low" },
      ollama: { provider: "ollama", model: "qwen2.5-coder:1.5b", chatModel: "qwen2.5:1.5b", imageModel: "not-supported", baseUrl: "http://127.0.0.1:11434", reasoningEffort: "none" },
    };
    setConfig(defaults[provider]);
    setStatus(null);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!window.atlasDesktop || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const state = await window.atlasDesktop.saveProvider({ config, ...(apiKey.trim() ? { apiKey } : {}) });
      setConfig(state.config);
      setHasApiKey(state.hasApiKey);
      setEncryptionAvailable(state.encryptionAvailable);
      setApiKey("");
      window.dispatchEvent(new Event("atlas:provider-changed"));
      setStatus({ kind: "success", text: "Provider settings saved." });
    } catch (error) {
      setStatus({ kind: "error", text: cleanError(error) });
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    if (!window.atlasDesktop || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await window.atlasDesktop.testProvider({ config, ...(apiKey.trim() ? { apiKey } : {}) });
      setStatus({ kind: "success", text: result.message });
    } catch (error) {
      setStatus({ kind: "error", text: cleanError(error) });
    } finally {
      setBusy(false);
    }
  };

  const clearApiKey = async () => {
    if (!window.atlasDesktop || busy) return;
    setBusy(true);
    try {
      const state = await window.atlasDesktop.saveProvider({ config, clearApiKey: true });
      setHasApiKey(state.hasApiKey);
      setApiKey("");
      window.dispatchEvent(new Event("atlas:provider-changed"));
      setStatus({ kind: "success", text: "Saved API key removed." });
    } catch (error) {
      setStatus({ kind: "error", text: cleanError(error) });
    } finally {
      setBusy(false);
    }
  };

  const needsCredential = config.provider === "openai" || config.provider === "compatible";

  return (
    <form onSubmit={save} className="space-y-5">
      {config.provider === "ollama" && <LocalAiSetup onActivated={(model, chatModel) => {
        setConfig({ provider: "ollama", model, chatModel, imageModel: "not-supported", baseUrl: "http://127.0.0.1:11434", reasoningEffort: "none" });
        window.dispatchEvent(new Event("atlas:provider-changed"));
      }} />}
      <section className="overflow-hidden rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.06] to-orange-400/[0.03] p-5">
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><Cpu className="h-5 w-5" /></div>
          <div><div className="flex items-center gap-2"><h2 className="text-sm font-medium text-zinc-100">Atlas Native AI</h2><span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300">From scratch</span></div><p className="mt-1 text-xs leading-5 text-zinc-500">Atlas's own byte tokenizer, transformer architecture, random initialization, verified training corpus, and local checkpoint. No borrowed model weights.</p></div>
        </div>
      </section>
      <SettingCard icon={KeyRound} title="Atlas model" description="One Atlas-owned local model powers Chat and Code Agent.">
        <ProviderField label="Provider" description="Third-party model selection is disabled for the Atlas-native build.">
          <select value={config.provider} onChange={(event) => chooseProvider(event.target.value as AtlasProviderKind)} className="provider-input">
            <option value="atlas">Atlas Native · from scratch</option>
          </select>
        </ProviderField>
        {(config.provider === "atlas" || config.provider === "compatible" || config.provider === "ollama") && <ProviderField label="Base URL" description="Atlas Native is restricted to this computer's loopback interface.">
          <input value={config.baseUrl} onChange={(event) => setConfig({ ...config, baseUrl: event.target.value })} className="provider-input w-72" spellCheck={false} />
        </ProviderField>}
        <ProviderField label="Chat model" description="Used for conversation, writing, learning, and planning.">
          <input value={config.chatModel} onChange={(event) => setConfig({ ...config, chatModel: event.target.value })} className="provider-input w-56" spellCheck={false} disabled={config.provider === "demo"} />
        </ProviderField>
        <ProviderField label="Code model" description="Used for Code Agent tasks and technical assistance.">
          <input value={config.model} onChange={(event) => setConfig({ ...config, model: event.target.value })} className="provider-input w-56" spellCheck={false} disabled={config.provider === "demo"} />
        </ProviderField>
        <ProviderField label="Image model" description={config.provider === "atlas" ? "Atlas image-model training has not started yet." : config.provider === "ollama" ? "Image generation is unavailable through the Ollama adapter." : "The model used by the Images workspace."}>
          <input value={config.imageModel} onChange={(event) => setConfig({ ...config, imageModel: event.target.value })} className="provider-input w-56" spellCheck={false} disabled={config.provider === "atlas" || config.provider === "demo" || config.provider === "ollama"} />
        </ProviderField>
        {config.provider === "openai" && <ProviderField label="Reasoning effort" description="Higher effort may increase response time and usage.">
          <select value={config.reasoningEffort} onChange={(event) => setConfig({ ...config, reasoningEffort: event.target.value as AtlasReasoningEffort })} className="provider-input">
            <option value="none">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select>
        </ProviderField>}
        {needsCredential && <ProviderField label="API key" description={hasApiKey ? "A key is saved. Leave this blank to keep it." : "The key is sent only to the provider through the native process."}>
          <div className="flex items-center gap-2">
            <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={hasApiKey ? "Saved securely" : "Enter API key"} autoComplete="off" className="provider-input w-56" disabled={!encryptionAvailable} />
            {hasApiKey && <button type="button" onClick={() => void clearApiKey()} className="rounded-lg px-2.5 py-2 text-[11px] text-rose-300/70 hover:bg-rose-400/10">Clear</button>}
          </div>
        </ProviderField>}
      </SettingCard>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => void test()} disabled={busy} className="rounded-lg border border-white/[0.09] bg-white/[0.03] px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/[0.07] disabled:opacity-50">Test connection</button>
        <button type="submit" disabled={busy} className="atlas-accent-bg rounded-lg px-4 py-2.5 text-xs font-medium text-white hover:brightness-110 disabled:opacity-50">Save provider</button>
        <span className="text-[11px] text-zinc-600">{encryptionAvailable ? "Credentials use OS-backed encryption." : "Credential encryption unavailable."}</span>
      </div>
      {status && <div role="status" className={`rounded-xl border px-4 py-3 text-xs ${status.kind === "success" ? "border-emerald-400/10 bg-emerald-400/[0.05] text-emerald-200/70" : "border-rose-400/10 bg-rose-400/[0.05] text-rose-200/70"}`}>{status.text}</div>}
    </form>
  );
}

function LocalAiSetup({ onActivated }: { onActivated: (model: string, chatModel: string) => void }) {
  const [local, setLocal] = useState<AtlasLocalAiStatus | null>(null);
  const [model, setModel] = useState("qwen2.5-coder:1.5b");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<AtlasLocalAiProgress | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const refresh = useCallback(async () => {
    if (!window.atlasDesktop) return;
    try {
      const status = await window.atlasDesktop.getLocalAiStatus();
      setLocal(status);
      setModel((current) => status.activeModel || (current === "qwen2.5-coder:1.5b" ? status.recommended.name : current));
    } catch (error) {
      setMessage({ kind: "error", text: cleanError(error) });
    }
  }, []);

  useEffect(() => {
    void refresh();
    return window.atlasDesktop?.onLocalAiProgress(setProgress);
  }, [refresh]);

  const openInstaller = async () => {
    await window.atlasDesktop?.openLocalAiInstaller();
    setMessage({ kind: "success", text: "The official Ollama installer page opened. Install it, then return here and press Refresh." });
  };

  const start = async () => {
    if (!window.atlasDesktop) return;
    setBusy(true);
    setMessage(null);
    try {
      setLocal(await window.atlasDesktop.startLocalAi());
      setMessage({ kind: "success", text: "Local AI service started." });
    } catch (error) {
      setMessage({ kind: "error", text: cleanError(error) });
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    if (!window.atlasDesktop) return;
    setBusy(true);
    setMessage(null);
    setProgress({ status: "Preparing download", completed: 0, total: 0, percent: 0 });
    try {
      const status = await window.atlasDesktop.pullLocalAiModel(model);
      setLocal(status);
      onActivated(model, status.activeChatModel || model);
      setMessage({ kind: "success", text: "Local Atlas AI is downloaded and active." });
    } catch (error) {
      setMessage({ kind: "error", text: cleanError(error) });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const activate = async () => {
    if (!window.atlasDesktop) return;
    setBusy(true);
    setMessage(null);
    try {
      const status = await window.atlasDesktop.useLocalAiModel(model);
      setLocal(status);
      onActivated(model, status.activeChatModel || model);
      setMessage({ kind: "success", text: "Local Atlas AI is now the active provider." });
    } catch (error) {
      setMessage({ kind: "error", text: cleanError(error) });
    } finally {
      setBusy(false);
    }
  };

  const availableModels = local ? Array.from(new Set([local.recommended.name, ...local.models.map((item) => item.name)])) : [model];
  const installed = Boolean(local?.models.some((item) => item.name === model));
  const active = Boolean(local?.active && local.activeModel === model);

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.06] to-indigo-400/[0.03]">
      <div className="flex items-start gap-4 p-5">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><Cpu className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><h2 className="text-sm font-medium text-zinc-100">Local Atlas AI</h2>{active && <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300">Active</span>}</div>
          <p className="mt-1 text-xs leading-5 text-zinc-500">Runs privately on this computer with no API key. Atlas selected a compact model for {local?.ramGb ?? "your"} GB RAM.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={busy} aria-label="Refresh local AI status" className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" /></button>
      </div>
      <div className="border-t border-white/[0.06] px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <select value={model} onChange={(event) => setModel(event.target.value)} disabled={busy} className="provider-input min-w-56">
            {availableModels.map((name) => <option key={name} value={name}>{name}{name === local?.recommended.name ? " · recommended" : ""}</option>)}
          </select>
          <span className="text-[11px] text-zinc-600">Recommended download: {formatBytes(local?.recommended.downloadBytes ?? 986_000_000)}</span>
          <div className="ml-auto flex gap-2">
            {!local?.runtimeInstalled && <button type="button" onClick={() => void openInstaller()} className="atlas-accent-bg flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-medium text-white hover:brightness-110"><Download className="h-3.5 w-3.5" /> Install Ollama</button>}
            {local?.runtimeInstalled && !local.runtimeRunning && <button type="button" onClick={() => void start()} disabled={busy} className="atlas-accent-bg rounded-lg px-4 py-2.5 text-xs font-medium text-white disabled:opacity-50">Start local service</button>}
            {local?.runtimeRunning && !installed && <button type="button" onClick={() => void download()} disabled={busy} className="atlas-accent-bg flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-medium text-white disabled:opacity-50"><Download className="h-3.5 w-3.5" /> Download model</button>}
            {local?.runtimeRunning && installed && !active && <button type="button" onClick={() => void activate()} disabled={busy} className="atlas-accent-bg rounded-lg px-4 py-2.5 text-xs font-medium text-white disabled:opacity-50">Use Local Atlas AI</button>}
          </div>
        </div>
        {progress && <div className="mt-4">
          <div className="mb-2 flex items-center text-[11px] text-zinc-500"><span>{progress.status}</span><span className="ml-auto">{progress.percent}%</span><button type="button" onClick={() => void window.atlasDesktop?.cancelLocalAiModel()} className="ml-3 text-zinc-600 hover:text-white" aria-label="Cancel model download"><X className="h-3.5 w-3.5" /></button></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/30"><div className="atlas-accent-bg h-full transition-[width]" style={{ width: `${progress.percent}%` }} /></div>
        </div>}
        {message && <div role="status" className={`mt-3 text-xs ${message.kind === "success" ? "text-emerald-300/70" : "text-rose-300/70"}`}>{message.text}</div>}
      </div>
    </section>
  );
}

function formatBytes(bytes: number) {
  if (!bytes) return "unknown";
  return bytes >= 1_000_000_000 ? `${(bytes / 1_000_000_000).toFixed(1)} GB` : `${Math.round(bytes / 1_000_000)} MB`;
}

function SecuritySettings() {
  const protections = [
    ["Renderer sandbox", "Enabled", "The interface cannot access Node.js or the filesystem directly."],
    ["Context isolation", "Enabled", "The page and native bridge run in separate JavaScript contexts."],
    ["Permission policy", "Deny by default", "Web pages cannot access camera, microphone, location, payment, USB, serial, or Bluetooth."],
    ["Local dictation", "Native and opt-in", "Speech recognition runs through the installed Windows recognizer only after the microphone button is pressed."],
    ["Navigation", "Restricted", "The window can load only the private Atlas origin; external pages cannot replace it."],
    ["External links", "HTTPS only", "Safe web links open outside Atlas in the system browser."],
    ["Webviews", "Blocked", "Extensions cannot embed arbitrary privileged web content."],
    ["Native messages", "Sender validated", "Every privileged request must originate from the trusted Atlas renderer."],
    ["Extension manifests", "Validated", "Imports are JSON-only, size-limited, sanitized, and never executed."],
    ["Provider secrets", "Encrypted", "API keys are encrypted by the operating system and decrypted only in the native process."],
    ["VS Code companion", "Loopback only", "The editor bridge accepts authenticated requests only on this computer and never uploads a workspace automatically."],
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] p-5">
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><LockKeyhole className="h-4 w-4" /></div><div><h2 className="text-sm font-medium text-emerald-100/80">Desktop protection baseline active</h2><p className="mt-1 text-xs text-zinc-500">Security-sensitive capabilities stay unavailable until their isolation is implemented.</p></div></div>
      </div>
      <CompanionSettings />
      <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">
        {protections.map(([name, status, description]) => (
          <div key={name} className="flex items-start gap-3 border-b border-white/[0.05] p-4 last:border-0">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/70" />
            <div><div className="text-sm text-zinc-300">{name}</div><p className="mt-1 text-xs leading-5 text-zinc-600">{description}</p></div>
            <span className="ml-auto shrink-0 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] text-emerald-300/70">{status}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

function CompanionSettings() {
  const [state, setState] = useState<AtlasCompanionState | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void window.atlasDesktop?.getCompanion().then(setState).catch((error) => setMessage(cleanError(error)));
  }, []);

  const copyToken = async () => {
    try {
      await window.atlasDesktop?.copyCompanionToken();
      setMessage("Pairing token copied. In VS Code, run Atlas: Connect to Desktop.");
    } catch (error) {
      setMessage(cleanError(error));
    }
  };

  const rotateToken = async () => {
    try {
      const next = await window.atlasDesktop?.rotateCompanionToken();
      if (next) setState(next);
      setMessage("Pairing token rotated. Existing VS Code connections must pair again.");
    } catch (error) {
      setMessage(cleanError(error));
    }
  };

  return (
    <SettingCard icon={Cable} title="VS Code companion" description="Use Atlas from an authenticated sidebar inside Visual Studio Code.">
      <SettingField label="Local bridge" description={state?.error || "Available only on this computer; never exposed to your network."}>
        <span className={`rounded-full px-2.5 py-1 text-[10px] ${state?.running ? "bg-emerald-400/10 text-emerald-300/70" : "bg-rose-400/10 text-rose-300/70"}`}>{state?.running ? "Running" : "Unavailable"}</span>
      </SettingField>
      <SettingField label="Bridge address" description="The VS Code extension connects to this loopback endpoint.">
        <code className="text-xs text-zinc-400">{state?.url || "http://127.0.0.1:47635"}</code>
      </SettingField>
      <SettingField label="Pairing token" description={`Stored ${state?.encrypted ? "with OS-backed encryption" : "for this session only"}. Rotating it revokes existing connections.`}>
        <div className="flex items-center gap-2">
          <code className="rounded-lg bg-black/20 px-2.5 py-2 text-[11px] text-zinc-500">••••••••{state?.token.slice(-6) || "••••••"}</code>
          <button type="button" onClick={() => void copyToken()} disabled={!state?.running} className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-2 text-[11px] text-zinc-300 hover:bg-white/[0.06] disabled:opacity-40"><Copy className="h-3.5 w-3.5" /> Copy</button>
          <button type="button" onClick={() => void rotateToken()} className="rounded-lg px-3 py-2 text-[11px] text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300">Rotate</button>
        </div>
      </SettingField>
      {message && <div role="status" className="pt-3 text-xs text-zinc-500">{message}</div>}
    </SettingCard>
  );
}

function ProviderField({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-16 items-center gap-6 border-b border-white/[0.05] py-3 last:border-0">
      <div className="min-w-0 flex-1"><div className="text-sm text-zinc-300">{label}</div><div className="mt-1 text-xs leading-5 text-zinc-600">{description}</div></div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function cleanError(error: unknown) {
  return error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': Error: /, "") : "An unexpected error occurred.";
}

function SettingCard({ icon: Icon, title, description, children }: { icon: typeof Palette; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.05] text-zinc-400"><Icon className="h-4 w-4" /></div>
        <div><h2 className="text-sm font-medium text-zinc-200">{title}</h2><p className="mt-1 text-xs text-zinc-600">{description}</p></div>
      </div>
      <div className="mt-5 border-t border-white/[0.06]">{children}</div>
    </section>
  );
}

function SettingField({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-16 items-center gap-4 border-b border-white/[0.05] py-3 last:border-0">
      <div><div className="text-sm text-zinc-300">{label}</div><div className="mt-1 text-xs text-zinc-600">{description}</div></div>
      <div className="ml-auto shrink-0">{children}</div>
    </div>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="flex rounded-lg bg-black/20 p-1">
      {options.map((option) => <button key={option} type="button" onClick={() => onChange(option)} className={`rounded-md px-2.5 py-1.5 text-[11px] capitalize transition ${value === option ? "atlas-accent-soft" : "text-zinc-600 hover:text-zinc-300"}`}>{option}</button>)}
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? "atlas-accent-bg" : "bg-zinc-700"}`}>
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${checked ? "left-6" : "left-1"}`} />
    </button>
  );
}

function TabButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof SlidersHorizontal; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs transition ${active ? "border-[var(--atlas-accent)] text-zinc-200" : "border-transparent text-zinc-600 hover:text-zinc-300"}`}>
      <Icon className="h-3.5 w-3.5" />{children}
    </button>
  );
}
