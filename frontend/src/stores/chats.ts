import { create } from "zustand";
import { persist } from "zustand/middleware";

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
}

interface ChatState {
  chats: SavedChat[];
  activeChatId: string | null;
  createChat: () => string;
  ensureChat: () => string;
  setActiveChat: (id: string) => void;
  addMessage: (chatId: string, message: Pick<SavedChatMessage, "role" | "content">) => SavedChatMessage;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chats: [],
      activeChatId: null,
      createChat: () => {
        const now = new Date().toISOString();
        const chat: SavedChat = { id: crypto.randomUUID(), title: "New chat", messages: [], createdAt: now, updatedAt: now };
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
    }),
    { name: "atlas-saved-chats", version: 1 },
  ),
);

function chatTitle(content: string) {
  const singleLine = content.replace(/\s+/g, " ").trim();
  return singleLine.length > 46 ? `${singleLine.slice(0, 46)}…` : singleLine || "New chat";
}
