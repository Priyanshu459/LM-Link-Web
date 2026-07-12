import React, { useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { User, Cpu } from 'lucide-react';

const ChatInterface = ({ messages }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const renderMarkdown = (text) => {
    const html = marked(text, { breaks: true });
    return { __html: DOMPurify.sanitize(html) };
  };

  if (messages.length === 0) {
    return (
      <div className="empty-state">
        <Cpu size={48} color="var(--accent-color)" style={{ marginBottom: '16px', opacity: 0.8 }} />
        <h2>LM Studio Web Interface</h2>
        <p>Send a message to start chatting with your local AI model.</p>
        
        <style dangerouslySetInnerHTML={{__html: `
          .empty-state {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
            text-align: center;
            padding: 40px;
          }
          .empty-state h2 {
            color: var(--text-primary);
            margin-bottom: 8px;
            font-weight: 500;
          }
        `}} />
      </div>
    );
  }

  return (
    <div className="chat-interface">
      {messages.map((msg, idx) => (
        <div key={idx} className={`message-row ${msg.role}`}>
          <div className="avatar">
            {msg.role === 'user' ? <User size={20} /> : <Cpu size={20} />}
          </div>
          <div className="message-content">
            <div 
              className={`bubble ${msg.role === 'user' ? 'user-bubble' : 'ai-bubble markdown-body'}`}
              dangerouslySetInnerHTML={renderMarkdown(msg.content)}
            />
          </div>
        </div>
      ))}
      <div ref={bottomRef} />

      <style dangerouslySetInnerHTML={{__html: `
        .chat-interface {
          flex: 1;
          overflow-y: auto;
          padding: 20px 0;
          display: flex;
          flex-direction: column;
        }
        .message-row {
          display: flex;
          gap: 16px;
          max-width: 800px;
          width: 100%;
          margin: 0 auto;
          padding: 16px 20px;
        }
        .message-row.user {
          flex-direction: row-reverse;
        }
        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .message-row.user .avatar {
          background: var(--panel-bg);
          border: 1px solid var(--panel-border);
        }
        .message-row.assistant .avatar {
          background: var(--accent-color);
          color: white;
        }
        .message-content {
          max-width: 80%;
          display: flex;
          flex-direction: column;
        }
        .message-row.user .message-content {
          align-items: flex-end;
        }
        .bubble {
          padding: 12px 16px;
          border-radius: 12px;
          line-height: 1.5;
        }
        .user-bubble {
          background: var(--user-bubble);
          color: var(--text-primary);
          border-bottom-right-radius: 4px;
        }
        .ai-bubble {
          background: var(--ai-bubble);
          color: var(--text-primary);
        }
      `}} />
    </div>
  );
};

export default ChatInterface;
