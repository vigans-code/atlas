import type { ReactNode } from "react";

import { useUiStore } from "../stores/ui";
import { CommandPalette } from "./CommandPalette";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  const { accentColor, density, fontScale, reducedMotion, theme } = useUiStore();
  const resolvedTheme = theme === "system" && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : theme === "light" ? "light" : "dark";
  return (
    <div
      data-accent={accentColor}
      data-density={density}
      data-font-scale={fontScale}
      data-reduced-motion={reducedMotion}
      data-theme={resolvedTheme}
      className="atlas-app atlas-shell flex h-[100dvh] min-h-0 flex-col overflow-hidden text-zinc-100"
    >
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
