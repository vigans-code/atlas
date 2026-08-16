import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ActivityType = "image" | "code" | "search";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  path: string;
  updatedAt: string;
  pinned: boolean;
}

interface ActivityState {
  items: ActivityItem[];
  record: (input: Omit<ActivityItem, "id" | "updatedAt" | "pinned"> & { id?: string }) => ActivityItem;
  rename: (id: string, title: string) => void;
  remove: (id: string) => void;
  togglePinned: (id: string) => void;
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set) => ({
      items: [],
      record: (input) => {
        const item: ActivityItem = {
          id: input.id ?? crypto.randomUUID(),
          type: input.type,
          title: cleanTitle(input.title),
          path: input.path,
          updatedAt: new Date().toISOString(),
          pinned: false,
        };
        set((state) => ({
          items: [item, ...state.items.filter((current) => current.id !== item.id)].slice(0, 100),
        }));
        return item;
      },
      rename: (id, title) => set((state) => ({
        items: state.items.map((item) => item.id === id ? { ...item, title: cleanTitle(title) } : item),
      })),
      remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
      togglePinned: (id) => set((state) => ({
        items: state.items.map((item) => item.id === id ? { ...item, pinned: !item.pinned } : item),
      })),
    }),
    { name: "atlas-workspace-activity", version: 1 },
  ),
);

function cleanTitle(value: string) {
  const title = value.replace(/\s+/g, " ").trim();
  return title.slice(0, 80) || "Untitled session";
}
