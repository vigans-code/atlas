import { Check, Clock3, FlaskConical, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { featureCatalog, featureCategories, type FeatureStatus } from "./featureCatalog";

export function FeatureManager() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return featureCatalog.filter((feature) =>
      (category === "All" || feature.category === category) &&
      (!normalized || `${feature.name} ${feature.category} ${feature.description}`.toLowerCase().includes(normalized)),
    );
  }, [category, query]);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-[1fr_210px]">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <span className="sr-only">Search capabilities</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search capabilities" className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] pl-10 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-400/50 focus:outline-none" />
        </label>
        <label>
          <span className="sr-only">Capability category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#181b20] px-3 text-sm text-zinc-300 focus:border-indigo-400/50 focus:outline-none">
            {featureCategories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <p className="mt-4 text-xs leading-5 text-zinc-600">Truthful release status only. Preview capabilities work but are not yet production-complete; planned capabilities cannot be enabled from this screen.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {filtered.map((feature) => {
          const visual = statusVisual(feature.status);
          const Icon = visual.icon;
          return <article key={feature.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"><div className="flex items-start gap-3"><div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${visual.iconClass}`}><Icon className="h-3.5 w-3.5" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="text-sm font-medium text-zinc-300">{feature.name}</h3><span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wide ${visual.badgeClass}`}>{feature.status}</span></div><p className="mt-1 text-[11px] text-zinc-600">{feature.category}</p><p className="mt-2 text-xs leading-5 text-zinc-500">{feature.description}</p></div></div></article>;
        })}
      </div>
      {!filtered.length && <div className="py-16 text-center text-sm text-zinc-600">No capabilities match this search.</div>}
    </div>
  );
}

function statusVisual(status: FeatureStatus) {
  if (status === "available") return { icon: Check, iconClass: "bg-emerald-400/10 text-emerald-300", badgeClass: "bg-emerald-400/10 text-emerald-300/80" };
  if (status === "preview") return { icon: FlaskConical, iconClass: "bg-amber-400/10 text-amber-300", badgeClass: "bg-amber-400/10 text-amber-300/80" };
  return { icon: Clock3, iconClass: "bg-white/[0.04] text-zinc-600", badgeClass: "bg-white/[0.04] text-zinc-600" };
}
