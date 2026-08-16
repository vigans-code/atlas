import { Cable, CheckCircle2, Copy, Cpu, LayoutPanelLeft, LockKeyhole, Monitor, Palette, Puzzle, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

import { navigate } from "../../lib/router";
import { type AccentColor, type FontScale, type InterfaceDensity, type ThemePreference, useUiStore } from "../../stores/ui";

type SettingsTab = "general" | "model" | "security";

const accentOptions: Array<{ value: AccentColor; color: string }> = [
  { value: "indigo", color: "#7768e8" },
  { value: "violet", color: "#8b5cf6" },
  { value: "emerald", color: "#2f9b72" },
  { value: "rose", color: "#d45170" },
  { value: "orange", color: "#d8783f" },
];

export function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("general");
  return (
    <div className="atlas-page h-full overflow-y-auto px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="atlas-eyebrow mb-3">Workspace preferences</div><h1 className="text-4xl text-white">Settings</h1><p className="mt-2 text-sm text-zinc-500">Manage appearance, the Atlas Native model, local data, and desktop security.</p></div>
          <button type="button" onClick={() => navigate("/extensions")} className="flex h-10 items-center rounded-xl border border-white/[0.08] px-4 text-xs text-zinc-400 hover:bg-white/[0.04]"><Puzzle className="mr-2 h-4 w-4" />Extensions</button>
        </header>
        <div className="mt-7 flex gap-1 border-b border-white/[0.07]">
          <TabButton active={tab === "general"} onClick={() => setTab("general")} icon={SlidersHorizontal}>General</TabButton>
          <TabButton active={tab === "model"} onClick={() => setTab("model")} icon={Cpu}>Atlas Native</TabButton>
          <TabButton active={tab === "security"} onClick={() => setTab("security")} icon={ShieldCheck}>Security</TabButton>
        </div>
        <div className="mt-7">
          {tab === "general" && <GeneralSettings />}
          {tab === "model" && <NativeModelSettings />}
          {tab === "security" && <SecuritySettings />}
        </div>
      </div>
    </div>
  );
}

function GeneralSettings() {
  const ui = useUiStore();
  return <div className="space-y-5">
    <SettingCard icon={Palette} title="Appearance" description="Personalize the desktop interface.">
      <SettingField label="Accent color" description="Used for active controls and highlights."><div className="flex gap-2">{accentOptions.map((option) => <button key={option.value} type="button" onClick={() => ui.setAccentColor(option.value)} aria-label={`${option.value} accent`} aria-pressed={ui.accentColor === option.value} className={`h-7 w-7 rounded-full border-2 transition ${ui.accentColor === option.value ? "scale-110 border-white" : "border-transparent"}`} style={{ backgroundColor: option.color }} />)}</div></SettingField>
      <SettingField label="Text size" description="Adjust text across the application."><Segmented value={ui.fontScale} options={["small", "default", "large"]} onChange={(value) => ui.setFontScale(value as FontScale)} /></SettingField>
      <SettingField label="Interface density" description="Choose spacing for navigation and controls."><Segmented value={ui.density} options={["compact", "comfortable"]} onChange={(value) => ui.setDensity(value as InterfaceDensity)} /></SettingField>
      <SettingField label="Reduced motion" description="Minimize interface animations."><Switch checked={ui.reducedMotion} onChange={ui.setReducedMotion} /></SettingField>
    </SettingCard>
    <SettingCard icon={LayoutPanelLeft} title="Code Agent layout" description="Control what appears beside the coding conversation."><SettingField label="Agent context panel" description="Show project tools and workspace status."><Switch checked={ui.showAgentContext} onChange={ui.setShowAgentContext} /></SettingField></SettingCard>
    <SettingCard icon={Monitor} title="Application" description="Desktop behavior and local data."><SettingField label="Theme" description="Use dark, light, or your operating-system preference."><Segmented value={ui.theme} options={["dark", "light", "system"]} onChange={(value) => ui.setTheme(value as ThemePreference)} /></SettingField><SettingField label="Preferences storage" description="Customization is saved on this device."><span className="text-xs text-emerald-400/80">Local</span></SettingField></SettingCard>
  </div>;
}

function NativeModelSettings() {
  const [state, setState] = useState<AtlasProviderState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { void window.atlasDesktop?.getProvider().then(setState).catch((error) => setMessage({ ok: false, text: cleanError(error) })); }, []);
  const test = async () => {
    if (!window.atlasDesktop || busy) return;
    setBusy(true); setMessage(null);
    try { const result = await window.atlasDesktop.testProvider(); setMessage({ ok: true, text: result.message }); }
    catch (error) { setMessage({ ok: false, text: cleanError(error) }); }
    finally { setBusy(false); }
  };
  const config = state?.config;
  return <div className="space-y-5">
    <section className="overflow-hidden rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.06] to-orange-400/[0.03] p-5"><div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><Cpu className="h-5 w-5" /></div><div><div className="flex items-center gap-2"><h2 className="text-sm font-medium text-zinc-100">Atlas Native AI</h2><span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300">From scratch</span></div><p className="mt-1 text-xs leading-5 text-zinc-500">Atlas's own byte tokenizer, transformer architecture, random initialization, Atlas-owned training corpus, and local checkpoint. It does not use API keys or third-party model weights.</p></div></div></section>
    <SettingCard icon={Cpu} title="Native runtime" description="The desktop app starts Atlas's private loopback model service automatically.">
      <SettingField label="Provider" description="Atlas Native is the only model provider."><code className="text-xs text-zinc-300">Atlas Native</code></SettingField>
      <SettingField label="Chat and code checkpoint" description="A single first-generation checkpoint powers both workspaces."><code className="text-xs text-zinc-300">{config?.chatModel ?? "atlas-native-v1"}</code></SettingField>
      <SettingField label="Runtime address" description="Restricted to this computer; no network or cloud endpoint."><code className="text-xs text-zinc-300">{config?.baseUrl ?? "http://127.0.0.1:47636"}</code></SettingField>
      <SettingField label="Image generation" description="Unavailable until Atlas has an independently trained image model."><span className="text-xs text-amber-300/70">Not trained</span></SettingField>
    </SettingCard>
    <div className="flex items-center gap-3"><button type="button" onClick={() => void test()} disabled={busy} className="rounded-lg border border-white/[0.09] bg-white/[0.03] px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/[0.07] disabled:opacity-50">{busy ? "Checking…" : "Test Atlas Native"}</button><span className="text-[11px] text-zinc-600">No provider selection. No API key.</span></div>
    {message && <div role="status" className={`rounded-xl border px-4 py-3 text-xs ${message.ok ? "border-emerald-400/10 bg-emerald-400/[0.05] text-emerald-200/70" : "border-rose-400/10 bg-rose-400/[0.05] text-rose-200/70"}`}>{message.text}</div>}
  </div>;
}

function SecuritySettings() {
  const protections = [
    ["Renderer sandbox", "Enabled", "The interface cannot access Node.js or the filesystem directly."],
    ["Context isolation", "Enabled", "The page and native bridge run in separate JavaScript contexts."],
    ["Permissions", "Deny by default", "Camera, location, payment, USB, serial, and Bluetooth stay blocked."],
    ["Atlas Native", "Loopback only", "Model requests cannot be redirected to a remote provider."],
    ["Navigation", "Restricted", "The window can load only the private Atlas origin."],
    ["Extension manifests", "Validated", "Imports are data-only, size-limited, sanitized, and never executed."],
  ];
  return <div className="space-y-5"><div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] p-5"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><LockKeyhole className="h-4 w-4" /></div><div><h2 className="text-sm font-medium text-emerald-100/80">Desktop protection baseline active</h2><p className="mt-1 text-xs text-zinc-500">Sensitive capabilities remain isolated in the native process.</p></div></div></div><CompanionSettings /><section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">{protections.map(([name, status, description]) => <div key={name} className="flex items-start gap-3 border-b border-white/[0.05] p-4 last:border-0"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/70" /><div><div className="text-sm text-zinc-300">{name}</div><p className="mt-1 text-xs leading-5 text-zinc-600">{description}</p></div><span className="ml-auto shrink-0 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] text-emerald-300/70">{status}</span></div>)}</section></div>;
}

function CompanionSettings() {
  const [state, setState] = useState<AtlasCompanionState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => { void window.atlasDesktop?.getCompanion().then(setState).catch((error) => setMessage(cleanError(error))); }, []);
  const copyToken = async () => { try { await window.atlasDesktop?.copyCompanionToken(); setMessage("Pairing token copied. In VS Code, run Atlas: Connect to Desktop."); } catch (error) { setMessage(cleanError(error)); } };
  const rotateToken = async () => { try { const next = await window.atlasDesktop?.rotateCompanionToken(); if (next) setState(next); setMessage("Pairing token rotated. Existing VS Code connections must pair again."); } catch (error) { setMessage(cleanError(error)); } };
  return <SettingCard icon={Cable} title="VS Code companion" description="Use Atlas from an authenticated sidebar inside Visual Studio Code."><SettingField label="Local bridge" description={state?.error || "Available only on this computer; never exposed to your network."}><span className={`rounded-full px-2.5 py-1 text-[10px] ${state?.running ? "bg-emerald-400/10 text-emerald-300/70" : "bg-rose-400/10 text-rose-300/70"}`}>{state?.running ? "Running" : "Unavailable"}</span></SettingField><SettingField label="Bridge address" description="The extension connects to this loopback endpoint."><code className="text-xs text-zinc-400">{state?.url || "http://127.0.0.1:47635"}</code></SettingField><SettingField label="Pairing token" description={`Stored ${state?.encrypted ? "with OS-backed encryption" : "for this session only"}.`}><div className="flex items-center gap-2"><code className="rounded-lg bg-black/20 px-2.5 py-2 text-[11px] text-zinc-500">••••••••{state?.token.slice(-6) || "••••••"}</code><button type="button" onClick={() => void copyToken()} disabled={!state?.running} className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-2 text-[11px] text-zinc-300 hover:bg-white/[0.06] disabled:opacity-40"><Copy className="h-3.5 w-3.5" /> Copy</button><button type="button" onClick={() => void rotateToken()} className="rounded-lg px-3 py-2 text-[11px] text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300">Rotate</button></div></SettingField>{message && <div role="status" className="pt-3 text-xs text-zinc-500">{message}</div>}</SettingCard>;
}

function cleanError(error: unknown) { return error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': Error: /, "") : "An unexpected error occurred."; }
function SettingCard({ icon: Icon, title, description, children }: { icon: typeof Palette; title: string; description: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5"><div className="flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.05] text-zinc-400"><Icon className="h-4 w-4" /></div><div><h2 className="text-sm font-medium text-zinc-200">{title}</h2><p className="mt-1 text-xs text-zinc-600">{description}</p></div></div><div className="mt-5 border-t border-white/[0.06]">{children}</div></section>; }
function SettingField({ label, description, children }: { label: string; description: string; children: React.ReactNode }) { return <div className="flex min-h-16 items-center gap-4 border-b border-white/[0.05] py-3 last:border-0"><div><div className="text-sm text-zinc-300">{label}</div><div className="mt-1 text-xs text-zinc-600">{description}</div></div><div className="ml-auto shrink-0">{children}</div></div>; }
function Segmented({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) { return <div className="flex rounded-lg bg-black/20 p-1">{options.map((option) => <button key={option} type="button" onClick={() => onChange(option)} className={`rounded-md px-2.5 py-1.5 text-[11px] capitalize transition ${value === option ? "atlas-accent-soft" : "text-zinc-600 hover:text-zinc-300"}`}>{option}</button>)}</div>; }
function Switch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) { return <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? "atlas-accent-bg" : "bg-zinc-700"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${checked ? "left-6" : "left-1"}`} /></button>; }
function TabButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof SlidersHorizontal; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs transition ${active ? "border-[var(--atlas-accent)] text-zinc-200" : "border-transparent text-zinc-600 hover:text-zinc-300"}`}><Icon className="h-3.5 w-3.5" />{children}</button>; }
