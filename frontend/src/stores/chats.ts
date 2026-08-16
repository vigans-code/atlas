import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface SavedChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface SavedChat {
  id: string;
  title: string;
  messages: SavedChatMessage[];
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
  archived?: boolean;
  parentChatId?: string;
  branchMessageId?: string;
}

interface ChatState {
  chats: SavedChat[];
  activeChatId: string | null;
  createChat: () => string;
  ensureChat: () => string;
  setActiveChat: (id: string) => void;
  addMessage: (chatId: string, message: Pick<SavedChatMessage, "role" | "content">) => SavedChatMessage;
  updateMessage: (chatId: string, messageId: string, content: string) => void;
  renameChat: (id: string, title: string) => void;
  removeChat: (id: string) => void;
  togglePinned: (id: string) => void;
  toggleArchived: (id: string) => void;
  branchChat: (chatId: string, messageId: string) => string | null;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chats: [],
      activeChatId: null,
      createChat: () => {
        const now = new Date().toISOString();
        const chat: SavedChat = { id: crypto.randomUUID(), title: "New chat", messages: [], createdAt: now, updatedAt: now, pinned: false, archived: false };
        set((state) => ({ chats: [chat, ...state.chats].slice(0, 30), activeChatId: chat.id }));
        return chat.id;
      },
      ensureChat: () => {
        const state = get();
        if (state.activeChatId && state.chats.some((chat) => chat.id === state.activeChatId)) return state.activeChatId;
        return state.createChat();
      },
      setActiveChat: (id) => {
        if (get().chats.some((chat) => chat.id === id)) set({ activeChatId: id });
      },
      addMessage: (chatId, input) => {
        const message: SavedChatMessage = {
          id: crypto.randomUUID(),
          role: input.role,
          content: input.content.slice(0, 16_000),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          chats: state.chats.map((chat) => chat.id === chatId ? {
            ...chat,
            title: chat.messages.length === 0 && message.role === "user" ? chatTitle(message.content) : chat.title,
            messages: [...chat.messages, message].slice(-80),
            updatedAt: message.createdAt,
          } : chat).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        }));
        return message;
      },
      updateMessage: (chatId, messageId, content) => set((state) => ({
        chats: state.chats.map((chat) => chat.id === chatId ? {
          ...chat,
          messages: chat.messages.map((message) => message.id === messageId ? { ...message, content: content.trim().slice(0, 16_000) } : message),
          updatedAt: new Date().toISOString(),
        } : chat),
      })),
      renameChat: (id, title) => set((state) => ({
        chats: state.chats.map((chat) => chat.id === id ? { ...chat, title: chatTitle(title), updatedAt: new Date().toISOString() } : chat),
      })),
      removeChat: (id) => set((state) => {
        const chats = state.chats.filter((chat) => chat.id !== id);
        return { chats, activeChatId: state.activeChatId === id ? chats[0]?.id ?? null : state.activeChatId };
      }),
      togglePinned: (id) => set((state) => ({
        chats: state.chats.map((chat) => chat.id === id ? { ...chat, pinned: !chat.pinned } : chat),
      })),
      toggleArchived: (id) => set((state) => ({
        chats: state.chats.map((chat) => chat.id === id ? { ...chat, archived: !chat.archived, updatedAt: new Date().toISOString() } : chat),
      })),
      branchChat: (chatId, messageId) => {
        const source = get().chats.find((chat) => chat.id === chatId);
        const branchIndex = source?.messages.findIndex((message) => message.id === messageId) ?? -1;
        if (!source || branchIndex < 0) return null;
        const now = new Date().toISOString();
        const branch: SavedChat = {
          id: crypto.randomUUID(),
          title: chatTitle(`Branch · ${source.title}`),
          messages: source.messages.slice(0, branchIndex + 1).map((message) => ({ ...message, id: crypto.randomUUID() })),
          createdAt: now,
          updatedAt: now,
          pinned: false,
          archived: false,
          parentChatId: source.id,
          branchMessageId: messageId,
        };
        set((state) => ({ chats: [branch, ...state.chats].slice(0, 50), activeChatId: branch.id }));
        return branch.id;
      },
    }),
    { name: "atlas-saved-chats", version: 1, storage: createJSONStorage(() => globalThis.localStorage) },
  ),
);

function chatTitle(content: string) {
  const singleLine = content.replace(/\s+/g, " ").trim();
  return singleLine.length > 46 ? `${singleLine.slice(0, 46)}…` : singleLine || "New chat";
}
