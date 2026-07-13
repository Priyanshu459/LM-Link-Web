import React, { useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { User, Cpu } from 'lucide-react';

// ── Security: Configure marked with safe, explicit options ───────────────────
// Disable features that can produce unexpected or dangerous HTML.
marked.setOptions({
  gfm: true,        // GitHub-flavored Markdown (safe subset)
  breaks: true,     // Convert newlines to <br>
  pedantic: false,
  mangle: false,    // Don't mangle email addresses
  headerIds: false, // Don't auto-generate id attrs on headings (prevents DOM clobbering)
});

// ── Security: DOMPurify configuration ────────────────────────────────────────
// Restrict what HTML elements/attributes survive sanitization.
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li',
    'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'img', 'span', 'del',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'title', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,       // Block data-* attributes
  FORCE_BODY: true,
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
};

// Force all links to open in a new tab with rel="noopener noreferrer"
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

const ChatInterface = ({ messages, isGenerating }) => {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const [autoScroll, setAutoScroll] = React.useState(true);

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isGenerating, autoScroll]);

  const renderMarkdown = (text) => {
    // Guard: ensure text is always a string
    const safeText = typeof text === 'string' ? text : '';
    const html = marked(safeText);
    return { __html: DOMPurify.sanitize(html, DOMPURIFY_CONFIG) };
  };

  if (messages.length === 0) {
    return (
      <div className="empty-state chat-empty-state">
        <Cpu size={48} color="var(--accent-color)" style={{ marginBottom: '16px', opacity: 0.8 }} />
        <h2>LM Studio Web Interface</h2>
        <p>Send a message to start chatting with your local AI model.</p>
      </div>
    );
  }

  const lastMessage = messages[messages.length - 1];
  const showTypingIndicator = isGenerating && lastMessage && lastMessage.role === 'user';

  return (
    <div className="chat-interface" ref={containerRef} onScroll={handleScroll}>
      {messages.map((msg, idx) => (
        <div key={idx} className={`message-row ${msg.role}`}>
          <div className="avatar">
            {msg.role === 'user' ? <User size={20} /> : <Cpu size={20} />}
          </div>
          <div className="message-content">
            <div className={`bubble ${msg.role === 'user' ? 'user-bubble' : 'ai-bubble markdown-body'}`}>
              {Array.isArray(msg.content) ? (
                <div className="complex-message">
                  {msg.content.map((part, i) => {
                    if (part.type === 'text') {
                      return <div key={i} dangerouslySetInnerHTML={renderMarkdown(part.text)} />;
                    } else if (part.type === 'image_url') {
                      // ── Security: Only allow data: URIs for user-uploaded images ──
                      const src = part.image_url?.url ?? '';
                      const isSafe = src.startsWith('data:image/');
                      return isSafe
                        ? <img key={i} src={src} alt="Attachment" className="message-attached-img" />
                        : null;
                    }
                    return null;
                  })}
                </div>
              ) : (
                <div dangerouslySetInnerHTML={renderMarkdown(msg.content)} />
              )}
            </div>
          </div>
        </div>
      ))}

      {showTypingIndicator && (
        <div className="message-row assistant">
          <div className="avatar">
            <Cpu size={20} />
          </div>
          <div className="message-content">
            <div className="bubble ai-bubble typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} style={{ height: '1px' }} />
    </div>
  );
};

export default ChatInterface;
