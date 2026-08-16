import { Download, Expand, ImagePlus, Images, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import { useActivityStore } from "../../stores/activity";
import { useFileStore } from "../../stores/files";
import { useLauncherStore } from "../../stores/launcher";

type GeneratedImage = {
  id: string;
  dataUrl: string;
  prompt: string;
  revisedPrompt: string | null;
};

export function ImagesWorkspace() {
  const imageModelReady = false;
  const [prompt, setPrompt] = useState("");
  const [providerLabel, setProviderLabel] = useState("Atlas Native");
  const [generated, setGenerated] = useState<GeneratedImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const recordActivity = useActivityStore((state) => state.record);
  const libraryFiles = useFileStore((state) => state.files);
  const takeDraft = useLauncherStore((state) => state.takeDraft);
  const takeAttachmentIds = useLauncherStore((state) => state.takeAttachmentIds);
  const [reference, setReference] = useState<AtlasSelectedFile | null>(null);

  useEffect(() => {
    void window.atlasDesktop?.getProvider().then((state) => setProviderLabel(providerName(state.config.provider))).catch(() => undefined);
  }, []);

  useEffect(() => {
    const launchedDraft = takeDraft("image");
    const ids = takeAttachmentIds("image");
    if (launchedDraft) setPrompt(launchedDraft);
    if (ids[0]) setReference(libraryFiles.find((file) => file.id === ids[0]) ?? null);
  }, [libraryFiles, takeAttachmentIds, takeDraft]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const requestPrompt = prompt.trim();
    if (!requestPrompt || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!window.atlasDesktop) throw new Error("Image generation is available in the Atlas desktop app.");
      const result = await window.atlasDesktop.providerImage(`${requestPrompt}\nPreferred aspect ratio: ${aspectRatio}`);
      setGenerated((current) => [{ id: crypto.randomUUID(), prompt: requestPrompt, ...result }, ...current].slice(0, 20));
      recordActivity({ type: "image", title: requestPrompt, path: "/image" });
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
          <div className="flex items-center gap-3"><h1 className="atlas-page-title">Image</h1><span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300/80">{providerLabel}</span></div>
          <p className="atlas-page-description">This workspace is reserved for Atlas's future independently trained image model.</p>
        </header>

        <div className="mt-6 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-4 py-3 text-xs leading-5 text-amber-100/70">Image generation is intentionally unavailable. Atlas will not disguise another company's image model as its own.</div>

        <form onSubmit={submit} className="atlas-composer mt-8 rounded-2xl border p-3">
          <textarea value={prompt} onChange={(event) => { setPrompt(event.target.value); setError(null); }} rows={3} maxLength={4000} placeholder="Describe the image you want to create…" className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-zinc-100 placeholder:text-zinc-600 focus:outline-none" />
          {reference && <div className="mb-2 flex items-center rounded-xl bg-[var(--atlas-elevated)] px-3 py-2 text-xs text-[var(--atlas-muted)]"><ImagePlus className="mr-2 h-3.5 w-3.5" />{reference.name}<span className="ml-2 text-[10px] text-[var(--atlas-subtle)]">Image editing is staged but unavailable for the current provider adapter.</span><button type="button" onClick={() => setReference(null)} className="atlas-icon-button ml-auto" aria-label="Remove reference"><X className="h-3.5 w-3.5" /></button></div>}
          <div className="flex items-center border-t border-white/[0.06] px-1 pt-3">
            <select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)} aria-label="Aspect ratio" className="rounded-lg border border-[var(--atlas-border)] bg-transparent px-2 py-1.5 text-xs text-[var(--atlas-muted)]"><option value="1:1">Square · 1:1</option><option value="16:9">Landscape · 16:9</option><option value="9:16">Portrait · 9:16</option><option value="4:3">Classic · 4:3</option></select>
            <button type="submit" disabled={!imageModelReady || !prompt.trim() || busy} className="atlas-accent-bg ml-auto flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-medium text-white enabled:hover:brightness-110 disabled:bg-zinc-700 disabled:text-zinc-500">
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
                <div className="p-4"><p className="line-clamp-3 text-xs leading-5 text-zinc-400">{image.revisedPrompt || image.prompt}</p><div className="mt-3 flex items-center gap-1"><button type="button" onClick={() => setPrompt(image.prompt)} className="atlas-icon-button" aria-label="Reuse prompt"><RefreshCw className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setSelectedImage(image)} className="atlas-icon-button" aria-label="View larger"><Expand className="h-3.5 w-3.5" /></button><a href={image.dataUrl} download={`atlas-image-${image.id}.png`} className="atlas-icon-button" aria-label="Download image"><Download className="h-3.5 w-3.5" /></a><button type="button" onClick={() => setGenerated((current) => current.filter((item) => item.id !== image.id))} className="atlas-icon-button ml-auto hover:text-rose-400" aria-label="Delete image"><Trash2 className="h-3.5 w-3.5" /></button></div></div>
              </article>
            ))}
          </section>
        ) : (
          <section className="mt-10 rounded-2xl border border-dashed border-white/10 py-24 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.04] text-zinc-600"><Images className="h-5 w-5" /></div>
            <h2 className="mt-4 text-sm font-medium text-zinc-300">Atlas image training has not started</h2>
            <p className="mt-2 text-xs text-zinc-600">Generated images will appear here after an Atlas-owned image checkpoint exists.</p>
            <ImagePlus className="mx-auto mt-5 h-4 w-4 text-zinc-700" />
          </section>
        )}
      </div>
      {selectedImage && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label="Generated image viewer" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedImage(null); }}><div className="relative max-h-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-black"><img src={selectedImage.dataUrl} alt={selectedImage.revisedPrompt || selectedImage.prompt} className="max-h-[85vh] max-w-full object-contain" /><button type="button" onClick={() => setSelectedImage(null)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white" aria-label="Close viewer"><X className="h-4 w-4" /></button></div></div>}
    </div>
  );
}

function providerName(provider: AtlasProviderKind) {
  return provider === "atlas" ? "Atlas Native" : "Atlas Native";
}

function cleanError(error: unknown) {
  return error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': Error: /, "") : "Image generation failed.";
}
