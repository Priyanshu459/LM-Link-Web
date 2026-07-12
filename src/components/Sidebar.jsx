import React, { useState, useRef } from 'react';
import { useStore } from '../store';
import { Plus, MessageSquare, Trash2, X } from 'lucide-react';

const ChatItem = ({ chat, activeChatId, setActiveChatId, setSidebarOpen, deleteChat }) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    const diff = e.touches[0].clientX - touchStartX.current;
    // Allow swiping left (negative diff) up to -60px
    if (diff < 0) {
      setSwipeOffset(Math.max(diff, -60));
    } else {
      setSwipeOffset(0);
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset < -30) {
      setSwipeOffset(-60); // Snap to open
    } else {
      setSwipeOffset(0); // Snap closed
    }
  };

  return (
    <div className="chat-item-container">
      <div 
        className={`chat-item ${chat.id === activeChatId ? 'active' : ''}`}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onClick={() => {
          setActiveChatId(chat.id);
          setSidebarOpen(false);
          setSwipeOffset(0);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <MessageSquare size={16} className="chat-icon" />
        <span className="chat-title" title={chat.title}>{chat.title || 'New Chat'}</span>
        <button 
          className="delete-btn desktop-only"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Delete this chat?')) deleteChat(chat.id);
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      
      <div className="mobile-delete-bg">
        <button 
          className="mobile-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Delete this chat?')) deleteChat(chat.id);
            setSwipeOffset(0);
          }}
        >
          <Trash2 size={18} color="white" />
        </button>
      </div>
    </div>
  );
};

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
          <ChatItem 
            key={chat.id}
            chat={chat}
            activeChatId={activeChatId}
            setActiveChatId={setActiveChatId}
            setSidebarOpen={setSidebarOpen}
            deleteChat={deleteChat}
          />
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
        .chat-item-container {
          position: relative;
          overflow: hidden;
          border-radius: 8px;
        }
        .chat-item {
          display: flex;
          align-items: center;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          background: transparent;
          transition: background 0.2s, transform 0.2s ease-out;
          color: var(--text-secondary);
          position: relative;
          z-index: 2;
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
        .mobile-delete-bg {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 60px;
          background: #ff3b30;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
          border-radius: 8px;
        }
        .mobile-delete-btn {
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (max-width: 768px) {
          .desktop-only {
            display: none !important;
          }
          .chat-item:hover {
            background: inherit; /* Disable hover background on mobile to prevent sticky hover state */
          }
          .chat-item.active {
            background: rgba(255, 255, 255, 0.1);
          }
        }
      `}} />
    </div>
    {isSidebarOpen && <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />}
    </>
  );
};

export default Sidebar;
