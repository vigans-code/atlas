import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ResearchCategory = "Cybersecurity" | "Programming" | "Technology" | "Games" | "Custom";

export interface SavedResearchSource {
  id: string;
  title: string;
  url: string;
  hostname: string;
  description: string;
  category: ResearchCategory;
  content: string;
  contentType: string;
  fetchedAt: string;
  bytes: number;
  truncated: boolean;
}

interface ResearchState {
  sources: SavedResearchSource[];
  selectedSourceIds: string[];
  saveSource: (source: AtlasFetchedResearchSource, metadata?: { category?: ResearchCategory; description?: string }) => SavedResearchSource;
  removeSource: (id: string) => void;
  toggleSource: (id: string) => void;
}

export const useResearchStore = create<ResearchState>()(
  persist(
    (set) => ({
      sources: [],
      selectedSourceIds: [],
      saveSource: (input, metadata) => {
        const source: SavedResearchSource = {
          ...input,
          id: crypto.randomUUID(),
          content: input.content.slice(0, 40_000),
          category: metadata?.category ?? "Custom",
          description: metadata?.description ?? "User-added public web source.",
        };
        set((state) => {
          const existing = state.sources.find((item) => item.url === source.url);
          const id = existing?.id ?? source.id;
          const saved = { ...source, id };
          return {
            sources: [saved, ...state.sources.filter((item) => item.id !== id)].slice(0, 24),
            selectedSourceIds: Array.from(new Set([id, ...state.selectedSourceIds])).slice(0, 12),
          };
        });
        return source;
      },
      removeSource: (id) => set((state) => ({
        sources: state.sources.filter((source) => source.id !== id),
        selectedSourceIds: state.selectedSourceIds.filter((sourceId) => sourceId !== id),
      })),
      toggleSource: (id) => set((state) => ({
        selectedSourceIds: state.selectedSourceIds.includes(id)
          ? state.selectedSourceIds.filter((sourceId) => sourceId !== id)
          : [...state.selectedSourceIds, id].slice(-12),
      })),
    }),
    { name: "atlas-research-sources" },
  ),
);
