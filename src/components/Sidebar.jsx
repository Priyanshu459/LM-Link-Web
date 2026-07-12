import React from 'react';
import { useStore } from '../store';
import { Plus, MessageSquare, Trash2, X } from 'lucide-react';

const Sidebar = () => {
  const { chats, activeChatId, createChat, setActiveChatId, deleteChat, isSidebarOpen, setSidebarOpen } = useStore();

  return (
    <>
    <div className={`sidebar glass-panel ${isSidebarOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <button className="btn-primary new-chat-btn" onClick={() => { createChat(); setSidebarOpen(false); }}>
          <Plus size={18} /> New Chat
        </button>
        <button className="mobile-close-btn" onClick={() => setSidebarOpen(false)}>
          <X size={20} />
        </button>
      </div>
      <div className="chat-list">
        {chats.map(chat => (
          <div 
            key={chat.id} 
            className={`chat-item ${chat.id === activeChatId ? 'active' : ''}`}
            onClick={() => {
              setActiveChatId(chat.id);
              setSidebarOpen(false);
            }}
          >
            <MessageSquare size={16} className="chat-icon" />
            <span className="chat-title" title={chat.title}>{chat.title || 'New Chat'}</span>
            <button 
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Delete this chat?')) deleteChat(chat.id);
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .sidebar {
          width: 260px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          border-radius: 0;
          border-top: none;
          border-bottom: none;
          border-left: none;
          height: 100%;
          padding: 16px;
        }
        .new-chat-btn {
          width: 100%;
          margin-bottom: 16px;
        }
        .chat-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .chat-item {
          display: flex;
          align-items: center;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
          color: var(--text-secondary);
        }
        .chat-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .chat-item.active {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-primary);
        }
        .chat-icon {
          flex-shrink: 0;
          margin-right: 12px;
        }
        .chat-title {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 0.9rem;
        }
        .delete-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
          padding: 4px;
        }
        .chat-item:hover .delete-btn {
          opacity: 1;
        }
        .delete-btn:hover {
          color: #ff6b6b;
        }
      `}} />
    </div>
    {isSidebarOpen && <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />}
    </>
  );
};

export default Sidebar;
