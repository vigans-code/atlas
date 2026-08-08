import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AccentColor = "indigo" | "violet" | "emerald" | "rose" | "orange";
export type InterfaceDensity = "compact" | "comfortable";
export type FontScale = "small" | "default" | "large";

interface UiState {
  sidebarCollapsed: boolean;
  accentColor: AccentColor;
  density: InterfaceDensity;
  fontScale: FontScale;
  reducedMotion: boolean;
  showAgentContext: boolean;
  enabledFeatures: string[];
  toggleSidebar: () => void;
  setAccentColor: (accentColor: AccentColor) => void;
  setDensity: (density: InterfaceDensity) => void;
  setFontScale: (fontScale: FontScale) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  setShowAgentContext: (showAgentContext: boolean) => void;
  toggleFeature: (featureId: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      accentColor: "indigo",
      density: "comfortable",
      fontScale: "default",
      reducedMotion: false,
      showAgentContext: true,
      enabledFeatures: [],
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setAccentColor: (accentColor) => set({ accentColor }),
      setDensity: (density) => set({ density }),
      setFontScale: (fontScale) => set({ fontScale }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setShowAgentContext: (showAgentContext) => set({ showAgentContext }),
      toggleFeature: (featureId) =>
        set((state) => ({
          enabledFeatures: state.enabledFeatures.includes(featureId)
            ? state.enabledFeatures.filter((id) => id !== featureId)
            : [...state.enabledFeatures, featureId],
        })),
    }),
    {
      name: "atlas-ui-preferences",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        accentColor: state.accentColor,
        density: state.density,
        fontScale: state.fontScale,
        reducedMotion: state.reducedMotion,
        showAgentContext: state.showAgentContext,
        enabledFeatures: state.enabledFeatures,
      }),
    },
  ),
);
