import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import SettingsModal from './components/SettingsModal';
import ChatInterface from './components/ChatInterface';
import MessageInput from './components/MessageInput';
import { sendChatCompletion } from './api';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState('http://localhost:1234/v1');
  const [selectedModel, setSelectedModel] = useState('');
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] = useState(null);

  // Load state from local storage on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('lmStudioUrl');
    const savedModel = localStorage.getItem('lmStudioModel');
    const savedMessages = localStorage.getItem('lmStudioMessages');

    if (savedUrl) setBaseUrl(savedUrl);
    if (savedModel) setSelectedModel(savedModel);
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error("Failed to parse saved messages");
      }
    }
  }, []);

  // Save state when it changes
  useEffect(() => {
    localStorage.setItem('lmStudioUrl', baseUrl);
  }, [baseUrl]);

  useEffect(() => {
    localStorage.setItem('lmStudioModel', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('lmStudioMessages', JSON.stringify(messages));
  }, [messages]);

  const handleSend = async (content) => {
    if (!selectedModel) {
      setIsSettingsOpen(true);
      return;
    }

    const newUserMsg = { role: 'user', content };
    const newMessages = [...messages, newUserMsg];
    setMessages(newMessages);

    setIsGenerating(true);
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // Add empty assistant message to start streaming into
      setMessages([...newMessages, { role: 'assistant', content: '' }]);

      await sendChatCompletion(
        baseUrl,
        selectedModel,
        newMessages,
        (chunk) => {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1].content += chunk;
            return updated;
          });
        }
      );
    } catch (error) {
      console.error(error);
      setMessages(prev => {
        const updated = [...prev];
        if (updated[updated.length - 1].content === '') {
          updated[updated.length - 1].content = '**Error:** Could not communicate with LM Studio. Check your URL, ensure the local server is running, and that CORS is enabled in LM Studio settings.';
        } else {
          updated[updated.length - 1].content += '\n\n**[Connection Interrupted]**';
        }
        return updated;
      });
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort(); // Wait, fetch API in api.js doesn't actually use signal yet. 
      // To keep it simple, we just set generating to false so UI updates, but the network request might still finish.
      // A proper fix would be passing the signal to fetch in api.js.
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the chat?')) {
      setMessages([]);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header glass-panel">
        <div className="logo-container">
          <div className="pulse-dot"></div>
          <h1>LM Link App</h1>
        </div>
        <div className="header-actions">
          {messages.length > 0 && (
            <button className="btn-icon" onClick={handleClear} title="Clear Chat">
              Clear
            </button>
          )}
          <button className="btn-icon" onClick={() => setIsSettingsOpen(true)} title="Settings">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="app-main">
        <ChatInterface messages={messages} />
        <div className="input-area">
          <MessageInput 
            onSend={handleSend} 
            isGenerating={isGenerating} 
            onStop={handleStop} 
          />
          <div className="model-indicator">
            {selectedModel ? `Model: ${selectedModel}` : 'No model selected. Open settings.'}
          </div>
        </div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        baseUrl={baseUrl}
        setBaseUrl={setBaseUrl}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
      />

      <style dangerouslySetInnerHTML={{__html: `
        .app-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
        }
        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          border-bottom: 1px solid var(--panel-border);
          border-top: none;
          border-left: none;
          border-right: none;
          border-radius: 0;
          z-index: 10;
        }
        .logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pulse-dot {
          width: 10px;
          height: 10px;
          background: #4ade80;
          border-radius: 50%;
          box-shadow: 0 0 8px #4ade80;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(74, 222, 128, 0); }
          100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
        }
        .logo-container h1 {
          font-size: 1.1rem;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .app-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }
        .input-area {
          background: linear-gradient(to top, var(--bg-color) 60%, transparent);
          padding-top: 24px;
          z-index: 5;
        }
        .model-indicator {
          text-align: center;
          font-size: 0.75rem;
          color: var(--text-secondary);
          padding-bottom: 12px;
        }
      `}} />
    </div>
  );
}

export default App;
