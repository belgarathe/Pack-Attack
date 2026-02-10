'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { MessageCircle, X, Send, LogIn, Shield } from 'lucide-react';

interface ChatUser {
  id: string;
  name: string;
  image: string | null;
  isTwitch: boolean;
  role: string;
}

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  user: ChatUser;
}

// Twitch icon SVG (inline so no external dependency)
function TwitchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
    </svg>
  );
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatPanel() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const isAtBottomRef = useRef(true);

  // Auto-scroll to bottom when new messages arrive (only if user is at bottom)
  const scrollToBottom = useCallback(() => {
    if (isAtBottomRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Track if user is scrolled to bottom
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 60;
    isAtBottomRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  // Load initial messages
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/chat/messages?limit=50')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMessages(data.messages);
          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView();
            }
          }, 50);
        }
      })
      .catch(console.error);
  }, [isOpen]);

  // SSE connection for real-time messages
  useEffect(() => {
    if (!isOpen) {
      // Close SSE when panel is closed
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setConnected(false);
      }
      return;
    }

    const es = new EventSource('/api/chat/stream');
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      setConnected(true);
    });

    es.addEventListener('message', (event) => {
      try {
        const msg: ChatMessage = JSON.parse(event.data);
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === msg.id)) return prev;
          const updated = [...prev, msg];
          // Keep last 200 messages in memory
          return updated.slice(-200);
        });
        scrollToBottom();

        // If panel is open but user scrolled up, count unread
        if (!isAtBottomRef.current) {
          setUnreadCount((c) => c + 1);
        }
      } catch {
        // Ignore parse errors
      }
    });

    es.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [isOpen, scrollToBottom]);

  // Reset unread count when panel opens or user scrolls to bottom
  useEffect(() => {
    if (isOpen && isAtBottomRef.current) {
      setUnreadCount(0);
    }
  }, [isOpen, messages]);

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setInput('');
        // Message will arrive via SSE, but add immediately for responsiveness
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message].slice(-200);
        });
        isAtBottomRef.current = true;
        scrollToBottom();
      } else if (data.error) {
        // Show error briefly (could use toast, but keeping it simple)
        console.warn('Chat error:', data.error);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setUnreadCount(0);
          }}
          className="fixed right-4 bottom-4 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-all duration-200 hover:scale-105 active:scale-95"
          aria-label="Open chat"
        >
          <MessageCircle className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-[11px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed right-0 top-16 bottom-0 z-40 w-full sm:w-[360px] flex flex-col bg-gray-950 border-l border-white/[0.08] shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="flex items-center justify-between h-12 px-4 border-b border-white/[0.08] bg-gray-950/95 shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-white">Chat</span>
              {connected && (
                <span className="flex items-center gap-1 text-[10px] text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  live
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-3 py-3 space-y-2 overscroll-contain"
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="w-10 h-10 text-gray-700 mb-3" />
                <p className="text-sm text-gray-500">No messages yet</p>
                <p className="text-xs text-gray-600 mt-1">Be the first to say something!</p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className="group flex gap-2.5 py-1">
                {/* Avatar */}
                <div className="shrink-0 mt-0.5">
                  {msg.user.image ? (
                    <img
                      src={msg.user.image}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-400">
                        {(msg.user.name || '?')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Message content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    {/* Name + badges */}
                    <span className={`text-xs font-semibold ${
                      msg.user.role === 'ADMIN'
                        ? 'text-red-400'
                        : msg.user.isTwitch
                        ? 'text-purple-400'
                        : 'text-blue-400'
                    }`}>
                      {msg.user.name}
                    </span>
                    {msg.user.isTwitch && (
                      <TwitchIcon className="w-3 h-3 text-purple-400 shrink-0 inline-block" />
                    )}
                    {msg.user.role === 'ADMIN' && (
                      <Shield className="w-3 h-3 text-red-400 shrink-0 inline-block" />
                    )}
                    <span className="text-[10px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 break-words leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="shrink-0 border-t border-white/[0.08] p-3">
            {session ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  maxLength={500}
                  className="flex-1 h-9 px-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white transition-colors"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-500 text-center">Sign in to chat</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => signIn('twitch')}
                    className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-[#9146FF] hover:bg-[#7C3AED] text-white text-sm font-medium transition-colors"
                  >
                    <TwitchIcon className="w-4 h-4" />
                    Twitch
                  </button>
                  <button
                    onClick={() => signIn()}
                    className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-gray-300 text-sm font-medium transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
