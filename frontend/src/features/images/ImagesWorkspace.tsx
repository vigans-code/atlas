import { ImagePlus, Images, Sparkles } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

type GeneratedImage = {
  id: string;
  dataUrl: string;
  prompt: string;
  revisedPrompt: string | null;
};

export function ImagesWorkspace() {
  const [prompt, setPrompt] = useState("");
  const [providerLabel, setProviderLabel] = useState("Local Demo");
  const [generated, setGenerated] = useState<GeneratedImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void window.atlasDesktop?.getProvider().then((state) => setProviderLabel(providerName(state.config.provider))).catch(() => undefined);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const requestPrompt = prompt.trim();
    if (!requestPrompt || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!window.atlasDesktop) throw new Error("Image generation is available in the Atlas desktop app.");
      const result = await window.atlasDesktop.providerImage(requestPrompt);
      setGenerated((current) => [{ id: crypto.randomUUID(), prompt: requestPrompt, ...result }, ...current].slice(0, 20));
      setPrompt("");
    } catch (caught) {
      setError(cleanError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="atlas-page h-full overflow-y-auto px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header>
          <div className="atlas-eyebrow mb-3">Visual studio / 05</div><div className="flex items-center gap-3"><h1 className="text-4xl text-white">Images</h1><span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300/80">{providerLabel}</span></div>
          <p className="mt-2 text-sm text-zinc-500">Create images through your configured AI provider.</p>
        </header>

        <form onSubmit={submit} className="atlas-composer mt-8 rounded-2xl border p-3">
          <textarea value={prompt} onChange={(event) => { setPrompt(event.target.value); setError(null); }} rows={3} maxLength={4000} placeholder="Describe the image you want to create…" className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-zinc-100 placeholder:text-zinc-600 focus:outline-none" />
          <div className="flex items-center border-t border-white/[0.06] px-1 pt-3">
            <span className="text-xs text-zinc-600">{providerLabel} image pipeline</span>
            <button type="submit" disabled={!prompt.trim() || busy} className="atlas-accent-bg ml-auto flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-medium text-white enabled:hover:brightness-110 disabled:bg-zinc-700 disabled:text-zinc-500">
              <Sparkles className={`h-3.5 w-3.5 ${busy ? "animate-pulse" : ""}`} /> {busy ? "Generating…" : "Generate"}
            </button>
          </div>
        </form>
        {error && <div role="alert" className="mt-3 rounded-xl border border-rose-400/10 bg-rose-400/[0.05] px-4 py-3 text-xs text-rose-200/70">{error}</div>}

        {generated.length ? (
          <section className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
            {generated.map((image) => (
              <article key={image.id} className="atlas-catalog-card overflow-hidden rounded-2xl border border-white/[0.07]">
                <img src={image.dataUrl} alt={image.revisedPrompt || image.prompt} className="aspect-square w-full object-cover" />
                <div className="p-4"><p className="line-clamp-3 text-xs leading-5 text-zinc-400">{image.revisedPrompt || image.prompt}</p></div>
              </article>
            ))}
          </section>
        ) : (
          <section className="mt-10 rounded-2xl border border-dashed border-white/10 py-24 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.04] text-zinc-600"><Images className="h-5 w-5" /></div>
            <h2 className="mt-4 text-sm font-medium text-zinc-300">No images yet</h2>
            <p className="mt-2 text-xs text-zinc-600">Generated images will appear here.</p>
            <ImagePlus className="mx-auto mt-5 h-4 w-4 text-zinc-700" />
          </section>
        )}
      </div>
    </div>
  );
}

function providerName(provider: AtlasProviderKind) {
  return { atlas: "Atlas Native", demo: "Local Demo", openai: "OpenAI", compatible: "Compatible API", ollama: "Legacy Ollama" }[provider];
}

function cleanError(error: unknown) {
  return error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': Error: /, "") : "Image generation failed.";
}
