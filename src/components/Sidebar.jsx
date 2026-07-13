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
    if (diff < 0) {
      setSwipeOffset(Math.max(diff, -64));
    } else {
      setSwipeOffset(0);
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset < -28) {
      setSwipeOffset(-64); // Snap to open
    } else {
      setSwipeOffset(0);   // Snap closed
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
        <MessageSquare size={15} className="chat-icon" />
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
          <button
            className="btn-primary new-chat-btn"
            onClick={() => { createChat(); setSidebarOpen(false); }}
          >
            <Plus size={17} /> New Chat
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
      </div>
      {isSidebarOpen && (
        <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />
      )}
    </>
  );
};

export default Sidebar;
