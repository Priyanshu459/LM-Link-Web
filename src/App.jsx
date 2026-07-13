import React, { useState, useEffect, useRef } from 'react';
import { Settings, Zap, ZapOff, Menu, MessageSquare, PlusCircle } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import MessageInput from './components/MessageInput';
import SettingsModal from './components/SettingsModal';
import Sidebar from './components/Sidebar';
import { pingServer, sendChatCompletion } from './api';
import { useStore } from './store';
import './App.css';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNetworkOffline, setIsNetworkOffline] = useState(!navigator.onLine);
  const abortControllerRef = useRef(null);
  const { 
    baseUrl, 
    selectedModel,
    temperature,
    maxTokens,
    systemPrompt,
    loadFromStorage, 
    isServerOnline, 
    setIsServerOnline,
    activeChatId,
    chats,
    addMessage,
    updateLastMessage,
    finalizeMessage,
    isGenerating,
    setIsGenerating,
    isSidebarOpen,
    setSidebarOpen
  } = useStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    const checkServer = async () => {
      if (!baseUrl) return;
      const isOnline = await pingServer(baseUrl);
      setIsServerOnline(isOnline);
    };
    checkServer();
    const intervalId = setInterval(checkServer, 10000);

    const handleOnline = () => setIsNetworkOffline(false);
    const handleOffline = () => setIsNetworkOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [baseUrl, setIsServerOnline]);

  // Handle Android physical back button
  useEffect(() => {
    if (!isSidebarOpen && window.innerWidth <= 768) {
      window.history.pushState({ sidebar: false }, '');
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    const handlePopState = (e) => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setSidebarOpen]);

  const activeChat = chats.find(c => c.id === activeChatId);

  const handleSend = async ({ text, attachments }) => {
    if (!selectedModel || !activeChatId) {
      alert("Please select a model in settings first, and ensure a chat is selected.");
      return;
    }

    abortControllerRef.current = new AbortController();
    const currentChatId = activeChatId;

    // Process attachments
    let finalContent = text;
    let imageAttachments = [];
    
    if (attachments && attachments.length > 0) {
      attachments.forEach(att => {
        if (att.type === 'text') {
          finalContent += `\n\n[SYSTEM: The user has attached a document named "${att.name}". Its extracted text content is provided below. Read it carefully to answer the user's request.]\n\n<file_content>\n${att.content}\n</file_content>`;
        } else if (att.type === 'image') {
          imageAttachments.push(att.url);
        }
      });
    }

    let newUserMessage = { role: 'user', content: finalContent };
    
    if (imageAttachments.length > 0) {
      // OpenAI Vision API format
      const contentArray = [{ type: 'text', text: finalContent }];
      imageAttachments.forEach(imgUrl => {
        contentArray.push({ type: 'image_url', image_url: { url: imgUrl } });
      });
      newUserMessage = { role: 'user', content: contentArray };
    }

    addMessage(currentChatId, newUserMessage);

    const newAssistantMessage = { role: 'assistant', content: '' };
    addMessage(currentChatId, newAssistantMessage);

    setIsGenerating(true);
    
    // Haptic feedback for send
    if (navigator.vibrate) navigator.vibrate(50);

    try {
      // Create context from activeChat.messages (which does not include the ones we just added to the store asynchronously)
      const chatContext = activeChat ? activeChat.messages : [];
      const messagesToSend = [...chatContext, newUserMessage];
      
      const options = { temperature, max_tokens: maxTokens, systemPrompt };

      await sendChatCompletion(
        baseUrl,
        selectedModel,
        messagesToSend,
        options,
        (chunk) => {
          updateLastMessage(currentChatId, chunk);
        },
        abortControllerRef.current.signal
      );
      finalizeMessage();
      // Haptic feedback for completion
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    } catch (error) {
      if (error.name === 'AbortError') {
        if (import.meta.env.DEV) console.log('Generation stopped by user');
      } else {
        if (import.meta.env.DEV) console.error('Chat error:', error);
        // ── Security: Sanitize error.message — never embed raw server strings as Markdown ──
        const safeMsg = String(error.message ?? 'Unknown error').replace(/[*_`[\]()]/g, '\\$&').slice(0, 200);
        updateLastMessage(currentChatId, `\n\n**[Error: ${safeMsg}]**`);
        // Haptic feedback for error
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
      }
      finalizeMessage();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
    finalizeMessage();
  };

  return (
    <div className="app-container">
      {isNetworkOffline && (
        <div className="offline-banner">
          ⚠️ No Internet Connection. Waiting for network...
        </div>
      )}
      <div className="app-layout">
        <Sidebar />
        
        <div className="main-content">
          <header className="app-header glass-panel">
            <div className="header-left">
              <button className="btn-icon desktop-menu-btn" onClick={() => setSidebarOpen(true)}>
                <Menu size={20} />
              </button>
              <div className="logo">
                <span className="logo-icon">✨</span>
                <h1>LM Link</h1>
              </div>
              <div className={`status-badge ${isServerOnline ? 'online' : 'offline'}`}>
                {isServerOnline ? <Zap size={14} /> : <ZapOff size={14} />}
                <span>{isServerOnline ? 'Connected' : 'Offline'}</span>
              </div>
            </div>
            <button className="btn-icon" onClick={() => setIsSettingsOpen(true)}>
              <Settings size={20} />
            </button>
          </header>

          <main className="chat-container">
            {activeChat ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <ChatInterface messages={activeChat.messages} isGenerating={isGenerating} />
                <div style={{ padding: '0 20px 20px 20px', flexShrink: 0 }}>
                  <MessageInput 
                    onSend={handleSend}
                    isGenerating={isGenerating}
                    onStop={handleStop}
                  />
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">✨</div>
                <h2>Create a new chat to start</h2>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="mobile-bottom-nav glass-panel">
        <button className="nav-item" onClick={() => setSidebarOpen(true)}>
          <MessageSquare size={24} />
          <span>Chats</span>
        </button>
        <button className="nav-item" onClick={() => useStore.getState().createChat()}>
          <PlusCircle size={24} />
          <span>New Chat</span>
        </button>
        <button className="nav-item" onClick={() => setIsSettingsOpen(true)}>
          <Settings size={24} />
          <span>Settings</span>
        </button>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />


    </div>
  );
}

export default App;
