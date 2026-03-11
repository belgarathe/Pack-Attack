'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import {
  MessageCircle,
  X,
  Send,
  LogIn,
  Shield,
  Trash2,
  Clock,
  Ban,
  MoreVertical,
  Volume2,
  VolumeX,
  Bell,
} from 'lucide-react';

interface ChatUser {
  id: string;
  name: string;
  image: string | null;
  isTwitch: boolean;
  isDiscord?: boolean;
  role: string;
}

interface ChatMessage {
  id: string;
  content: string;
  isDeleted?: boolean;
  createdAt: string;
  user: ChatUser;
}

interface BanStatus {
  banned: boolean;
  type: 'TIMEOUT' | 'BAN' | null;
  expiresAt: string | null;
  reason: string | null;
}

type SoundMode = 'all' | 'focused' | 'off';

const SOUND_MODE_KEY = 'chat-sound-mode';

function getSavedSoundMode(): SoundMode {
  if (typeof window === 'undefined') return 'all';
  const saved = localStorage.getItem(SOUND_MODE_KEY);
  if (saved === 'all' || saved === 'focused' || saved === 'off') return saved;
  return 'all';
}

// Subtle two-note ascending chime via Web Audio API
function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // First note (C5 = 523Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.value = 523;
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Second note (E5 = 659Hz), slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 659;
    gain2.gain.setValueAtTime(0.06, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.22);

    // Clean up context after sounds finish
    setTimeout(() => ctx.close(), 500);
  } catch {
    // Audio not available
  }
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

// Admin context menu for messages
function AdminMessageMenu({
  message,
  onDelete,
  onTimeout,
  onBan,
}: {
  message: ChatMessage;
  onDelete: (id: string) => void;
  onTimeout: (userId: string, userName: string, duration: string) => void;
  onBan: (userId: string, userName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-5 h-5 rounded text-gray-600 hover:text-gray-300 hover:bg-white/[0.06] transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Message actions"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-6 z-50 w-44 py-1 rounded-lg bg-gray-900 border border-white/[0.1] shadow-xl shadow-black/40">
          <button
            onClick={() => {
              onDelete(message.id);
              setOpen(false);
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-300 hover:bg-white/[0.06] hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete message
          </button>
          <div className="h-px bg-white/[0.06] my-1" />
          <button
            onClick={() => {
              onTimeout(message.user.id, message.user.name, '1h');
              setOpen(false);
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-300 hover:bg-white/[0.06] hover:text-yellow-400 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            Timeout 1 hour
          </button>
          <button
            onClick={() => {
              onTimeout(message.user.id, message.user.name, '1d');
              setOpen(false);
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-300 hover:bg-white/[0.06] hover:text-yellow-400 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            Timeout 1 day
          </button>
          <button
            onClick={() => {
              onTimeout(message.user.id, message.user.name, '1w');
              setOpen(false);
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-300 hover:bg-white/[0.06] hover:text-yellow-400 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            Timeout 1 week
          </button>
          <div className="h-px bg-white/[0.06] my-1" />
          <button
            onClick={() => {
              onBan(message.user.id, message.user.name);
              setOpen(false);
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Ban className="w-3.5 h-3.5" />
            Ban permanently
          </button>
        </div>
      )}
    </div>
  );
}

export function ChatPanel() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [banStatus, setBanStatus] = useState<BanStatus | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const isAtBottomRef = useRef(true);

  const [soundMode, setSoundMode] = useState<SoundMode>('all');
  const [soundToast, setSoundToast] = useState<string | null>(null);
  const tabFocusedRef = useRef(true);

  const isAdmin = session?.user && 'role' in session.user && session.user.role === 'ADMIN';

  // Load sound mode from localStorage on mount
  useEffect(() => {
    setSoundMode(getSavedSoundMode());
  }, []);

  // Track tab focus
  useEffect(() => {
    const onFocus = () => { tabFocusedRef.current = true; };
    const onBlur = () => { tabFocusedRef.current = false; };
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const cycleSoundMode = () => {
    const next: Record<SoundMode, SoundMode> = { all: 'focused', focused: 'off', off: 'all' };
    const labels: Record<SoundMode, string> = {
      all: 'Sound: Always on',
      focused: 'Sound: Only when tab is active',
      off: 'Sound: Off',
    };
    const newMode = next[soundMode];
    setSoundMode(newMode);
    localStorage.setItem(SOUND_MODE_KEY, newMode);
    setSoundToast(labels[newMode]);
  };

  // Auto-clear sound toast after 2 seconds
  useEffect(() => {
    if (!soundToast) return;
    const t = setTimeout(() => setSoundToast(null), 2000);
    return () => clearTimeout(t);
  }, [soundToast]);

  // Auto-clear filter error after 4 seconds
  useEffect(() => {
    if (!filterError) return;
    const t = setTimeout(() => setFilterError(null), 4000);
    return () => clearTimeout(t);
  }, [filterError]);

  // Auto-clear action feedback after 3 seconds
  useEffect(() => {
    if (!actionFeedback) return;
    const t = setTimeout(() => setActionFeedback(null), 3000);
    return () => clearTimeout(t);
  }, [actionFeedback]);

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

  // Load initial messages (with ban status)
  useEffect(() => {
    if (!isOpen) return;

    fetch(`/api/chat/messages?limit=20&banStatus=true`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMessages(data.messages);
          if (data.banStatus) {
            setBanStatus(data.banStatus);
          }
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
          // Keep last 20 messages in client memory
          return updated.slice(-20);
        });
        scrollToBottom();

        // If panel is open but user scrolled up, count unread
        if (!isAtBottomRef.current) {
          setUnreadCount((c) => c + 1);
        }

        // Play notification sound (not for own messages)
        const isOwnMessage = session?.user?.id && msg.user.id === session.user.id;
        if (!isOwnMessage && soundMode !== 'off') {
          if (soundMode === 'all' || (soundMode === 'focused' && tabFocusedRef.current)) {
            playNotificationSound();
          }
        }
      } catch {
        // Ignore parse errors
      }
    });

    // Handle delete events from admin actions
    es.addEventListener('delete', (event) => {
      try {
        const { id } = JSON.parse(event.data);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, content: '[message deleted]', isDeleted: true } : m,
          ),
        );
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
  }, [isOpen, scrollToBottom, soundMode, session]);

  // Reset unread count when panel opens or user scrolls to bottom
  useEffect(() => {
    if (isOpen && isAtBottomRef.current) {
      setUnreadCount(0);
    }
  }, [isOpen, messages]);

  // Admin actions
  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/chat/messages/${messageId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        // Optimistic update (SSE will also broadcast)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, content: '[message deleted]', isDeleted: true } : m,
          ),
        );
        setActionFeedback('Message deleted');
      } else {
        setActionFeedback(data.error || 'Failed to delete');
      }
    } catch {
      setActionFeedback('Failed to delete message');
    }
  };

  const handleTimeoutUser = async (userId: string, userName: string, duration: string) => {
    try {
      const res = await fetch('/api/chat/admin/timeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, duration }),
      });
      const data = await res.json();
      if (data.success) {
        const labels: Record<string, string> = { '1h': '1 hour', '1d': '1 day', '1w': '1 week' };
        setActionFeedback(`${userName} timed out for ${labels[duration] || duration}`);
      } else {
        setActionFeedback(data.error || 'Failed to timeout');
      }
    } catch {
      setActionFeedback('Failed to timeout user');
    }
  };

  const handleBanUser = async (userId: string, userName: string) => {
    if (!confirm(`Permanently ban ${userName} from chat?`)) return;
    try {
      const res = await fetch('/api/chat/admin/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        setActionFeedback(`${userName} banned from chat`);
      } else {
        setActionFeedback(data.error || 'Failed to ban');
      }
    } catch {
      setActionFeedback('Failed to ban user');
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    setSending(true);
    setFilterError(null);
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
          return [...prev, data.message].slice(-20);
        });
        isAtBottomRef.current = true;
        scrollToBottom();
      } else if (data.banStatus) {
        // User got banned/timed out
        setBanStatus(data.banStatus);
      } else if (data.error) {
        setFilterError(data.error);
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

  // Format ban expiry for display
  const formatBanExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return '';
    const date = new Date(expiresAt);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    if (diff <= 0) return 'expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
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
            <div className="flex items-center gap-1">
              <button
                onClick={cycleSoundMode}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                aria-label={`Sound: ${soundMode}`}
                title={soundMode === 'all' ? 'Sound: On' : soundMode === 'focused' ? 'Sound: Focused only' : 'Sound: Off'}
              >
                {soundMode === 'all' ? (
                  <Volume2 className="w-4 h-4 text-purple-400" />
                ) : soundMode === 'focused' ? (
                  <Bell className="w-4 h-4 text-yellow-400" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sound mode toast */}
          {soundToast && (
            <div className="mx-3 mt-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-white/[0.08] text-xs text-gray-300 text-center">
              {soundToast}
            </div>
          )}

          {/* Action feedback toast */}
          {actionFeedback && (
            <div className="mx-3 mt-2 px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-xs text-purple-300 text-center">
              {actionFeedback}
            </div>
          )}

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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Name + badges */}
                    <span
                      className={`text-xs font-semibold ${
                        msg.user.role === 'ADMIN'
                          ? 'text-red-400'
                          : msg.user.isTwitch
                            ? 'text-purple-400'
                            : 'text-blue-400'
                      }`}
                    >
                      {msg.user.name}
                    </span>
                    {msg.user.isTwitch && (
                      <TwitchIcon className="w-3 h-3 text-purple-400 shrink-0 inline-block" />
                    )}
                    {msg.user.role === 'ADMIN' && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/30">
                        <Shield className="w-2.5 h-2.5 text-red-400" />
                        <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">
                          Admin
                        </span>
                      </span>
                    )}
                    {/* Timestamp — always visible */}
                    <span className="text-[10px] text-gray-600 ml-auto shrink-0">
                      {formatTime(msg.createdAt)}
                    </span>
                    {/* Admin context menu */}
                    {isAdmin && !msg.isDeleted && msg.user.role !== 'ADMIN' && (
                      <AdminMessageMenu
                        message={msg}
                        onDelete={handleDeleteMessage}
                        onTimeout={handleTimeoutUser}
                        onBan={handleBanUser}
                      />
                    )}
                  </div>
                  {msg.isDeleted ? (
                    <p className="text-xs text-gray-600 italic leading-relaxed">
                      [message deleted]
                    </p>
                  ) : (
                    <p className="text-sm text-gray-300 break-words leading-relaxed">
                      {msg.content}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Filter error toast */}
          {filterError && (
            <div className="mx-3 mb-1 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-xs text-red-300 text-center">
              {filterError}
            </div>
          )}

          {/* Input area */}
          <div className="shrink-0 border-t border-white/[0.08] p-3">
            {session ? (
              banStatus?.banned ? (
                // User is banned or timed out
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <Ban className="w-4 h-4 text-red-400 shrink-0" />
                  <div className="text-xs text-red-300">
                    {banStatus.type === 'BAN' ? (
                      <span>You are permanently banned from chat.</span>
                    ) : (
                      <span>
                        Timed out — {formatBanExpiry(banStatus.expiresAt)} remaining
                      </span>
                    )}
                    {banStatus.reason && (
                      <span className="block text-red-400/70 mt-0.5">
                        Reason: {banStatus.reason}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
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
              )
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
