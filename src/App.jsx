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
        updateLastMessage(currentChatId, `\n\n**[Error: ${error.message}]**`);
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
        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 24px;
          border-bottom: 1px solid var(--panel-border);
          flex-shrink: 0;
          border-radius: 0;
          border-top: none;
          border-left: none;
          border-right: none;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .logo h1 {
          font-size: 1.2rem;
          font-weight: 600;
          margin: 0;
        }
        .status-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          padding: 4px 8px;
          border-radius: 12px;
          background: rgba(255,255,255,0.05);
        }
        .status-badge.online { color: #4ade80; }
        .status-badge.offline { color: #ff6b6b; }
        .chat-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
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
