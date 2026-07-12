import React, { useState } from 'react';
import { X, Monitor, Smartphone, Check, Copy } from 'lucide-react';

const SetupGuideModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('pc');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText('npx cloudflared tunnel --url http://localhost:1234');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content setup-guide-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <span>✨ Connect LM Studio</span>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="setup-tabs">
          <button 
            className={`setup-tab ${activeTab === 'pc' ? 'active' : ''}`}
            onClick={() => setActiveTab('pc')}
          >
            <Monitor size={18} /> I am on my PC
          </button>
          <button 
            className={`setup-tab ${activeTab === 'phone' ? 'active' : ''}`}
            onClick={() => setActiveTab('phone')}
          >
            <Smartphone size={18} /> I am on my Phone
          </button>
        </div>

        <div className="setup-content">
          {activeTab === 'pc' ? (
            <div className="guide-step-list">
              <div className="guide-step">
                <div className="step-num">1</div>
                <div className="step-text">Open <b>LM Studio</b> on this computer and go to the <b>Local Server</b> tab.</div>
              </div>
              <div className="guide-step">
                <div className="step-num">2</div>
                <div className="step-text">Check the box that says <b>Enable CORS</b>, then click <b>Start Server</b>.</div>
              </div>
              <div className="guide-step">
                <div className="step-num">3</div>
                <div className="step-text">
                  In LM Link Settings, type the following URL:
                  <div className="code-box">http://localhost:1234/v1</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="guide-step-list">
              <div className="guide-step">
                <div className="step-num">1</div>
                <div className="step-text">On your <b>PC</b>, open Command Prompt or Terminal.</div>
              </div>
              <div className="guide-step">
                <div className="step-num">2</div>
                <div className="step-text">
                  Paste and run this Cloudflare Tunnel command:
                  <div className="code-box copyable" onClick={handleCopy}>
                    <code>npx cloudflared tunnel --url http://localhost:1234</code>
                    <button className="copy-btn">
                      {copied ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="guide-step">
                <div className="step-num">3</div>
                <div className="step-text">
                  Wait a few seconds. The terminal will print a random URL (e.g. <code>https://random.trycloudflare.com</code>). 
                  Copy it, paste it into LM Link Settings on your phone, and add <b>/v1</b> to the end!
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .setup-guide-modal {
          max-width: 500px;
        }
        .setup-tabs {
          display: flex;
          background: rgba(0,0,0,0.2);
          padding: 6px;
          border-radius: 12px;
          margin-bottom: 24px;
        }
        .setup-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        .setup-tab.active {
          background: var(--panel-bg);
          color: var(--text-primary);
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .guide-step-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .guide-step {
          display: flex;
          gap: 16px;
        }
        .step-num {
          background: var(--accent-color);
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
          flex-shrink: 0;
        }
        .step-text {
          color: var(--text-primary);
          font-size: 0.95rem;
          line-height: 1.5;
          padding-top: 2px;
        }
        .code-box {
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--panel-border);
          padding: 12px 16px;
          border-radius: 8px;
          font-family: monospace;
          color: #4ade80;
          margin-top: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .code-box.copyable {
          cursor: pointer;
          transition: background 0.2s;
        }
        .code-box.copyable:hover {
          background: rgba(0,0,0,0.5);
        }
        .copy-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          cursor: pointer;
        }
      `}} />
    </div>
  );
};

export default SetupGuideModal;
