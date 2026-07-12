import React, { useState, useEffect, useRef } from 'react';
import { Settings, Zap, ZapOff } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import MessageInput from './components/MessageInput';
import SettingsModal from './components/SettingsModal';
import Sidebar from './components/Sidebar';
import { pingServer, sendChatCompletion } from './api';
import { useStore } from './store';
import './App.css';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
    setIsGenerating
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
    return () => clearInterval(intervalId);
  }, [baseUrl, setIsServerOnline]);

  const activeChat = chats.find(c => c.id === activeChatId);

  const handleSend = async (content) => {
    if (!selectedModel || !activeChatId) {
      alert("Please select a model in settings first, and ensure a chat is selected.");
      return;
    }

    const currentChatId = activeChatId;
    const newUserMessage = { role: 'user', content };
    addMessage(currentChatId, newUserMessage);

    const newAssistantMessage = { role: 'assistant', content: '' };
    addMessage(currentChatId, newAssistantMessage);

    setIsGenerating(true);

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
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Generation stopped by user');
      } else {
        console.error('Chat error:', error);
        updateLastMessage(currentChatId, '\\n\\n**[Error connecting to LM Studio]**');
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
      <div className="app-layout">
        <Sidebar />
        
        <div className="main-content">
          <header className="app-header glass-panel">
            <div className="header-left">
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
                <ChatInterface messages={activeChat.messages} />
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

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      <style dangerouslySetInnerHTML={{__html: `
        .app-layout {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
        }
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          min-width: 0;
        }
        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }
        .empty-icon {
          font-size: 3rem;
          margin-bottom: 16px;
          opacity: 0.5;
        }
      `}} />
    </div>
  );
}

export default App;
