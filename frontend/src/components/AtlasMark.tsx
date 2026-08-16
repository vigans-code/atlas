import { AtlasAtom } from "./AtlasAtom";

export function AtlasMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="atlas-brand-mark grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-lg shadow-black/20">
        <AtlasAtom size={24} />
      </div>
      {!compact && (
        <div>
          <div className="atlas-wordmark text-lg tracking-tight text-white">Atlas</div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">AI workspace</div>
        </div>
      )}
    </div>
  );
}
