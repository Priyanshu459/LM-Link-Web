import { create } from 'zustand';
import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';

localforage.config({
  name: 'LMLinkApp',
  storeName: 'store'
});

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

  // Actions
  setSettings: (settings) => {
    set((state) => ({ ...state, ...settings }));
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
            newTitle = message.content.substring(0, 30) + (message.content.length > 30 ? '...' : '');
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
    const data = await localforage.getItem('appState');
    if (data) {
      set(data);
      if (data.chats && data.chats.length === 0) {
        get().createChat();
      }
    } else {
      get().createChat();
    }
  }
}));
