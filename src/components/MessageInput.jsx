import React, { useState, useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';

const MessageInput = ({ onSend, isGenerating, onStop }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (input.trim() && !isGenerating) {
      onSend(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <div className="message-input-container">
      <div className="glass-panel input-wrapper">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message LM Studio..."
          rows={1}
          disabled={isGenerating}
        />
        {isGenerating ? (
          <button className="send-btn stop" onClick={onStop} title="Stop generation">
            <Square size={18} fill="currentColor" />
          </button>
        ) : (
          <button 
            className="send-btn" 
            onClick={handleSend} 
            disabled={!input.trim()}
          >
            <Send size={18} />
          </button>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .message-input-container {
          padding: 20px;
          max-width: 800px;
          width: 100%;
          margin: 0 auto;
        }
        .input-wrapper {
          display: flex;
          align-items: flex-end;
          padding: 12px 16px;
          border-radius: 24px;
          gap: 12px;
          transition: border-color 0.3s;
        }
        .input-wrapper:focus-within {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 1px var(--accent-color), 0 8px 32px 0 rgba(0, 0, 0, 0.3);
        }
        textarea {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 1rem;
          resize: none;
          max-height: 200px;
          outline: none;
          padding: 0;
          margin: 0;
          line-height: 1.5;
        }
        textarea::placeholder {
          color: var(--text-secondary);
        }
        .send-btn {
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .send-btn:disabled {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          cursor: not-allowed;
        }
        .send-btn:not(:disabled):hover {
          background: var(--accent-hover);
          transform: scale(1.05);
        }
        .send-btn.stop {
          background: transparent;
          color: var(--text-primary);
          border: 1px solid var(--text-secondary);
        }
        .send-btn.stop:hover {
          background: rgba(255,255,255,0.1);
        }
      `}} />
    </div>
  );
};

export default MessageInput;
