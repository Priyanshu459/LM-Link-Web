import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip, X, FileText, Mic } from 'lucide-react';
// ── Security: Import pdfjs-dist statically instead of dynamically injecting
//              a <script> tag from a CDN at runtime (supply-chain attack vector).
import * as pdfjs from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure the worker once at module load
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// ── Security: File upload limits ─────────────────────────────────────────────
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'text/plain', 'text/markdown', 'text/csv', 'application/json',
  'application/javascript', 'text/javascript',
  'text/x-python', 'text/html', 'text/css',
  'application/pdf',
]);
// Map from allowed extensions (from the <input accept> attr) to allowed MIME types
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|gif|webp|svg|txt|md|csv|json|js|py|html|css|pdf)$/i;

const MessageInput = ({ onSend, isGenerating, onStop }) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setInput(prev => (prev + ' ' + finalTranscript).trim());
        }
      };

      recognition.onerror = (event) => {
        if (import.meta.env.DEV) console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Voice input is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Validates a file before processing.
   * Returns an error string or null if valid.
   */
  const validateFile = (file) => {
    // ── Security: Reject oversized files (DoS prevention) ────────────────────
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 20 MB.`;
    }
    // ── Security: Validate MIME type against allowlist ───────────────────────
    if (!ALLOWED_MIME_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.test(file.name)) {
      return `"${file.name}" has an unsupported file type (${file.type || 'unknown'}). Please upload images, text, PDF, JSON, or code files.`;
    }
    return null;
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);

    for (const file of files) {
      // ── Security: Validate before reading ────────────────────────────────
      const validationError = validateFile(file);
      if (validationError) {
        alert(validationError);
        continue;
      }

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setAttachments(prev => [...prev, { type: 'image', url: ev.target.result, name: file.name }]);
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        try {
          const arrayBuffer = await file.arrayBuffer();
          // ── Security: Uses local npm pdfjs-dist, NOT a CDN-injected script ──
          const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ') + '\n';
          }

          if (!text.trim()) {
            alert(`No text could be extracted from ${file.name}. It might be a scanned image or lack a text layer.`);
            continue;
          }

          setAttachments(prev => [...prev, { type: 'text', content: text, name: file.name }]);
        } catch (error) {
          if (import.meta.env.DEV) console.error('Error parsing PDF:', error);
          alert('Failed to parse PDF. Please ensure it is a valid text-based PDF.');
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

        <button
          className={`attach-btn mic-btn ${isListening ? 'listening' : ''}`}
          onClick={toggleListening}
          disabled={isGenerating}
          title="Voice input"
        >
          <Mic size={20} color={isListening ? '#ff6b6b' : 'currentColor'} />
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
    </div>
  );
};

export default MessageInput;
