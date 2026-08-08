import type { ReactNode } from "react";

import { useUiStore } from "../stores/ui";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  const { accentColor, density, fontScale, reducedMotion } = useUiStore();
  return (
    <div
      data-accent={accentColor}
      data-density={density}
      data-font-scale={fontScale}
      data-reduced-motion={reducedMotion}
      className="atlas-app atlas-shell flex h-screen min-h-[640px] flex-col overflow-hidden text-zinc-100"
    >
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
