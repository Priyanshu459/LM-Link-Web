import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip, X, FileText } from 'lucide-react';

const MessageInput = ({ onSend, isGenerating, onStop }) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  const loadPdfJs = async () => {
    if (window.pdfjsLib) return window.pdfjsLib;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
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

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setAttachments(prev => [...prev, { type: 'image', url: ev.target.result, name: file.name }]);
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfjs = await loadPdfJs();
          
          const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ') + '\\n';
          }
          setAttachments(prev => [...prev, { type: 'text', content: text, name: file.name }]);
        } catch (error) {
          console.error("Error parsing PDF:", error);
          alert("Failed to parse PDF. Please ensure it is a valid text-based PDF.");
        }
      } else {
        // Read as text
        const reader = new FileReader();
        reader.onload = (ev) => {
          setAttachments(prev => [...prev, { type: 'text', content: ev.target.result, name: file.name }]);
        };
        reader.readAsText(file);
      }
    }
    
    e.target.value = null; // Reset
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if ((input.trim() || attachments.length > 0) && !isGenerating) {
      onSend({ text: input.trim(), attachments });
      setInput('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <div className="message-input-container">
      {attachments.length > 0 && (
        <div className="attachments-preview">
          {attachments.map((att, index) => (
            <div key={index} className="attachment-item">
              <button className="remove-btn" onClick={() => removeAttachment(index)}>
                <X size={14} />
              </button>
              {att.type === 'image' ? (
                <img src={att.url} alt={att.name} className="attachment-img" />
              ) : (
                <div className="attachment-doc">
                  <FileText size={24} />
                  <span className="doc-name">{att.name}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="glass-panel input-wrapper">
        <input 
          type="file" 
          multiple 
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          accept="image/*,.txt,.md,.csv,.json,.js,.py,.html,.css,.pdf"
        />
        <button 
          className="attach-btn" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isGenerating}
          title="Attach file"
        >
          <Paperclip size={20} />
        </button>

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
            disabled={!input.trim() && attachments.length === 0}
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
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .attachments-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          padding: 0 16px;
        }
        .attachment-item {
          position: relative;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--panel-border);
          border-radius: 12px;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .attachment-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .attachment-doc {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px;
          color: var(--text-secondary);
        }
        .doc-name {
          font-size: 0.65rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
          text-align: center;
        }
        .remove-btn {
          position: absolute;
          top: 4px;
          right: 4px;
          background: rgba(0,0,0,0.6);
          color: white;
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .attachment-item:hover .remove-btn {
          opacity: 1;
        }
        .remove-btn:hover {
          background: #ff6b6b;
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
        .attach-btn {
          background: transparent;
          color: var(--text-secondary);
          border: none;
          padding: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
          margin-bottom: 2px;
        }
        .attach-btn:hover {
          color: var(--text-primary);
        }
        .attach-btn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
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
          padding: 8px 0;
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
          margin-bottom: 2px;
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
