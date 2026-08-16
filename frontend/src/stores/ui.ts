import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AccentColor = "indigo" | "violet" | "emerald" | "rose" | "orange";
export type InterfaceDensity = "compact" | "comfortable";
export type FontScale = "small" | "default" | "large";
export type ThemePreference = "dark" | "light" | "system";

interface UiState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  theme: ThemePreference;
  accentColor: AccentColor;
  density: InterfaceDensity;
  fontScale: FontScale;
  reducedMotion: boolean;
  showAgentContext: boolean;
  enabledFeatures: string[];
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setTheme: (theme: ThemePreference) => void;
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
      mobileSidebarOpen: false,
      theme: "dark",
      accentColor: "indigo",
      density: "comfortable",
      fontScale: "default",
      reducedMotion: false,
      showAgentContext: true,
      enabledFeatures: [],
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
      setTheme: (theme) => set({ theme }),
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
        theme: state.theme,
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
