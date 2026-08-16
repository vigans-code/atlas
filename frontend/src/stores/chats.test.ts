import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let useChatStore: typeof import("./chats")["useChatStore"];

beforeAll(async () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  });
  ({ useChatStore } = await import("./chats"));
});

beforeEach(() => {
  useChatStore.setState({ chats: [], activeChatId: null });
});

describe("conversation branching", () => {
  it("copies history through the branch point without changing the original", () => {
    const originalId = useChatStore.getState().createChat();
    const first = useChatStore.getState().addMessage(originalId, { role: "user", content: "Plan an API" });
    const branchPoint = useChatStore.getState().addMessage(originalId, { role: "assistant", content: "Here is a plan" });
    useChatStore.getState().addMessage(originalId, { role: "user", content: "Use Python" });

    const branchId = useChatStore.getState().branchChat(originalId, branchPoint.id);
    const state = useChatStore.getState();
    const original = state.chats.find((chat) => chat.id === originalId);
    const branch = state.chats.find((chat) => chat.id === branchId);

    expect(original?.messages).toHaveLength(3);
    expect(branch?.messages.map((message) => message.content)).toEqual([first.content, branchPoint.content]);
    expect(branch?.messages.map((message) => message.id)).not.toEqual([first.id, branchPoint.id]);
    expect(branch?.parentChatId).toBe(originalId);
    expect(branch?.branchMessageId).toBe(branchPoint.id);
    expect(state.activeChatId).toBe(branchId);
  });

  it("archives a conversation without deleting it", () => {
    const id = useChatStore.getState().createChat();
    useChatStore.getState().toggleArchived(id);
    expect(useChatStore.getState().chats.find((chat) => chat.id === id)?.archived).toBe(true);
    useChatStore.getState().toggleArchived(id);
    expect(useChatStore.getState().chats.find((chat) => chat.id === id)?.archived).toBe(false);
  });
});
