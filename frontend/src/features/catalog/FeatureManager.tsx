import { Check, Filter, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { useUiStore } from "../../stores/ui";
import { featureCatalog, featureCategories } from "./featureCatalog";

export function FeatureManager() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const { enabledFeatures, toggleFeature } = useUiStore();

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return featureCatalog.filter((feature) =>
      (category === "All" || feature.category === category) &&
      (!normalized || `${feature.name} ${feature.category} ${feature.description}`.toLowerCase().includes(normalized)),
    );
  }, [category, query]);

  const availableCount = featureCatalog.filter((feature) => feature.status === "available").length;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-[1fr_210px]">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search capabilities" className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] pl-10 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-400/50 focus:outline-none" />
        </label>
        <label className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-white/[0.08] bg-[#181b20] pl-10 pr-3 text-sm text-zinc-300 focus:border-indigo-400/50 focus:outline-none">
            {featureCategories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3 text-xs text-zinc-600">
        <span>{featureCatalog.length} registered capabilities</span>
        <span>•</span>
        <span>{availableCount} available now</span>
        <span>•</span>
        <span>{enabledFeatures.length} experimental flags enabled</span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {filtered.map((feature) => {
          const active = feature.status === "available" || enabledFeatures.includes(feature.id);
          return (
            <article key={feature.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="flex items-start gap-3">
                <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${active ? "atlas-accent-soft" : "bg-white/[0.04] text-zinc-600"}`}>
                  {active ? <Check className="h-3.5 w-3.5" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-medium text-zinc-300">{feature.name}</h3>
                    <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wide ${feature.status === "available" ? "bg-emerald-400/10 text-emerald-300/70" : "bg-white/[0.04] text-zinc-600"}`}>
                      {feature.status === "available" ? "Available" : "Extension"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-600">{feature.category}</p>
                </div>
                {feature.status === "extension" && (
                  <button type="button" onClick={() => toggleFeature(feature.id)} aria-label={`Toggle ${feature.name}`} className={`relative h-5 w-9 shrink-0 rounded-full transition ${enabledFeatures.includes(feature.id) ? "atlas-accent-bg" : "bg-zinc-700"}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${enabledFeatures.includes(feature.id) ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!filtered.length && <div className="py-16 text-center text-sm text-zinc-600">No capabilities match this search.</div>}
    </div>
  );
}
