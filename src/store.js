import { create } from 'zustand';
import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';

localforage.config({
  name: 'LMLinkApp',
  storeName: 'store'
});

// ── Security: Clamp values to safe ranges ────────────────────────────────────
const MAX_TOKENS_MIN = 1;
const MAX_TOKENS_MAX = 32768;
const TEMPERATURE_MIN = 0;
const TEMPERATURE_MAX = 2;
const MAX_CHATS = 200;
const MAX_MESSAGES_PER_CHAT = 2000;
const MAX_CONTENT_LENGTH = 500_000; // 500k chars per message

const clamp = (val, min, max) => Math.min(Math.max(Number(val) || min, min), max);

/**
 * Validates and sanitizes data loaded from localforage before it is applied
 * to the Zustand store. This prevents a malicious or corrupted storage entry
 * from poisoning app state with unexpected types or values.
 */
const sanitizeStoredData = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  // Validate baseUrl — must be a string with http/https scheme
  let baseUrl = 'http://localhost:1234/v1';
  if (typeof raw.baseUrl === 'string' && raw.baseUrl.length < 2048) {
    try {
      const parsed = new URL(raw.baseUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        baseUrl = raw.baseUrl;
      }
    } catch { /* invalid URL — use default */ }
  }

  const selectedModel =
    typeof raw.selectedModel === 'string' && raw.selectedModel.length < 512
      ? raw.selectedModel
      : '';

  const systemPrompt =
    typeof raw.systemPrompt === 'string' && raw.systemPrompt.length < 50_000
      ? raw.systemPrompt
      : '';

  const temperature = clamp(raw.temperature, TEMPERATURE_MIN, TEMPERATURE_MAX);
  const maxTokens = clamp(raw.maxTokens, MAX_TOKENS_MIN, MAX_TOKENS_MAX);

  // Sanitize chats array
  let chats = [];
  if (Array.isArray(raw.chats)) {
    chats = raw.chats
      .slice(0, MAX_CHATS)
      .filter(chat => chat && typeof chat === 'object')
      .map(chat => ({
        id: typeof chat.id === 'string' ? chat.id.slice(0, 64) : uuidv4(),
        title: typeof chat.title === 'string' ? chat.title.slice(0, 200) : 'Chat',
        messages: Array.isArray(chat.messages)
          ? chat.messages
              .slice(0, MAX_MESSAGES_PER_CHAT)
              .filter(m => m && typeof m === 'object')
              .map(m => ({
                role: ['user', 'assistant', 'system'].includes(m.role) ? m.role : 'user',
                content:
                  typeof m.content === 'string'
                    ? m.content.slice(0, MAX_CONTENT_LENGTH)
                    : Array.isArray(m.content)
                    ? m.content.slice(0, 20) // multipart messages
                    : '',
              }))
          : [],
      }));
  }

  const activeChatId =
    typeof raw.activeChatId === 'string' && raw.activeChatId.length < 64
      ? raw.activeChatId
      : null;

  return { baseUrl, selectedModel, temperature, maxTokens, systemPrompt, chats, activeChatId };
};

export const useStore = create((set, get) => ({
  // Settings
  baseUrl: 'http://localhost:1234/v1',
  selectedModel: '',
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt: '',

  // Chats
  chats: [],
  activeChatId: null,

  // App State
  isGenerating: false,
  isServerOnline: true,
  isSidebarOpen: false,

  // Actions
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  setSettings: (settings) => {
    // ── Security: Clamp numeric fields before persisting ──────────────────
    const sanitized = { ...settings };
    if ('maxTokens' in sanitized) {
      sanitized.maxTokens = clamp(sanitized.maxTokens, MAX_TOKENS_MIN, MAX_TOKENS_MAX);
    }
    if ('temperature' in sanitized) {
      sanitized.temperature = clamp(sanitized.temperature, TEMPERATURE_MIN, TEMPERATURE_MAX);
    }
    set((state) => ({ ...state, ...sanitized }));
    get().saveToStorage();
  },

  createChat: () => {
    const newChat = {
      id: uuidv4(),
      title: 'New Chat',
      messages: []
    };
    set((state) => ({
      chats: [newChat, ...state.chats],
      activeChatId: newChat.id
    }));
    get().saveToStorage();
  },

  deleteChat: (id) => {
    set((state) => {
      const newChats = state.chats.filter(c => c.id !== id);
      return {
        chats: newChats,
        activeChatId: state.activeChatId === id
          ? (newChats.length > 0 ? newChats[0].id : null)
          : state.activeChatId
      };
    });
    get().saveToStorage();
  },

  setActiveChatId: (id) => {
    set({ activeChatId: id });
    get().saveToStorage();
  },

  addMessage: (chatId, message) => {
    set((state) => ({
      chats: state.chats.map(chat => {
        if (chat.id === chatId) {
          let newTitle = chat.title;
          if (chat.messages.length === 0 && message.role === 'user') {
            const text = typeof message.content === 'string'
              ? message.content
              : (Array.isArray(message.content) ? (message.content[0]?.text ?? '') : '');
            newTitle = text.substring(0, 30) + (text.length > 30 ? '...' : '');
          }
          return { ...chat, title: newTitle, messages: [...chat.messages, message] };
        }
        return chat;
      })
    }));
    get().saveToStorage();
  },

  updateLastMessage: (chatId, contentChunk, overwrite = false) => {
    set((state) => ({
      chats: state.chats.map(chat => {
        if (chat.id === chatId) {
          const newMessages = [...chat.messages];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg) {
            newMessages[newMessages.length - 1] = {
              ...lastMsg,
              content: overwrite ? contentChunk : lastMsg.content + contentChunk
            };
          }
          return { ...chat, messages: newMessages };
        }
        return chat;
      })
    }));
  },

  finalizeMessage: () => {
    get().saveToStorage();
  },

  setIsGenerating: (isGen) => set({ isGenerating: isGen }),
  setIsServerOnline: (isOnline) => set({ isServerOnline: isOnline }),

  // Persistence
  saveToStorage: async () => {
    const state = get();
    const dataToSave = {
      baseUrl: state.baseUrl,
      selectedModel: state.selectedModel,
      temperature: state.temperature,
      maxTokens: state.maxTokens,
      systemPrompt: state.systemPrompt,
      chats: state.chats,
      activeChatId: state.activeChatId
    };
    await localforage.setItem('appState', dataToSave);
  },

  loadFromStorage: async () => {
    try {
      const raw = await localforage.getItem('appState');
      // ── Security: Validate/sanitize before applying to store ─────────────
      const data = sanitizeStoredData(raw);
      if (data) {
        set(data);
        if (data.chats && data.chats.length === 0) {
          get().createChat();
        }
      } else {
        get().createChat();
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load from storage:', err);
      get().createChat();
    }
  }
}));
