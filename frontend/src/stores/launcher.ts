import { create } from "zustand";

type LaunchTarget = "chat" | "image" | "code" | "search";

interface LauncherState {
  drafts: Partial<Record<LaunchTarget, string>>;
  attachmentIds: string[];
  attachmentTarget: LaunchTarget | null;
  setDraft: (target: LaunchTarget, value: string) => void;
  takeDraft: (target: LaunchTarget) => string;
  sendFilesTo: (target: LaunchTarget, ids: string[]) => void;
  takeAttachmentIds: (target: LaunchTarget) => string[];
}

export const useLauncherStore = create<LauncherState>((set, get) => ({
  drafts: {},
  attachmentIds: [],
  attachmentTarget: null,
  setDraft: (target, value) => set((state) => ({ drafts: { ...state.drafts, [target]: value } })),
  takeDraft: (target) => {
    const value = get().drafts[target] ?? "";
    set((state) => {
      const drafts = { ...state.drafts };
      delete drafts[target];
      return { drafts };
    });
    return value;
  },
  sendFilesTo: (target, ids) => set({ attachmentIds: ids, attachmentTarget: target }),
  takeAttachmentIds: (target) => {
    const ids = get().attachmentTarget === target ? get().attachmentIds : [];
    if (get().attachmentTarget === target) set({ attachmentIds: [], attachmentTarget: null });
    return ids;
  },
}));
