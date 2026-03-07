'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  MessageSquare,
  Bug,
  Lightbulb,
  Swords,
  Package,
  Store,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  UserCheck,
  ArrowUp,
  ArrowDown,
  Send,
  MessageCircle,
  Shield,
  Plus,
  History,
  Pencil,
  X,
  Save,
} from 'lucide-react';

type FeedbackMsg = {
  id: string;
  content: string;
  isAdmin: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
};

type Feedback = {
  id: string;
  category: string;
  experience: number | null;
  subject: string;
  message: string;
  originalMessage: string | null;
  status: string;
  claimedBy: { id: string; name: string | null } | null;
  _count: { messages: number };
  createdAt: string;
  updatedAt: string;
  // loaded on expand
  messages?: FeedbackMsg[];
};

const categoryConfig: Record<string, { icon: typeof Bug; label: string; color: string }> = {
  BUG_REPORT: { icon: Bug, label: 'Bug Report', color: 'red' },
  FEATURE_REQUEST: { icon: Lightbulb, label: 'Feature Request', color: 'amber' },
  GENERAL: { icon: MessageSquare, label: 'General', color: 'blue' },
  BATTLE_ISSUE: { icon: Swords, label: 'Battle Issue', color: 'purple' },
  PACK_ISSUE: { icon: Package, label: 'Pack Issue', color: 'green' },
  SHOP_ISSUE: { icon: Store, label: 'Shop Issue', color: 'orange' },
};

const statusConfig: Record<string, { icon: typeof Clock; label: string; color: string }> = {
  OPEN: { icon: Clock, label: 'Open', color: 'blue' },
  CLAIMED: { icon: UserCheck, label: 'Claimed', color: 'indigo' },
  IN_PROGRESS: { icon: Loader2, label: 'In Progress', color: 'amber' },
  RESOLVED: { icon: CheckCircle2, label: 'Resolved', color: 'green' },
  CLOSED: { icon: XCircle, label: 'Closed', color: 'gray' },
};

export default function FeedbackHistoryPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [showOriginal, setShowOriginal] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/feedback/my-history?sort=${sortOrder}`);
      const data = await res.json();
      if (data.success) {
        setFeedbacks(data.feedbacks);
      }
    } catch (error) {
      console.error('Failed to fetch feedback history:', error);
    } finally {
      setLoading(false);
    }
  }, [sortOrder]);

  useEffect(() => {
    if (session) {
      fetchHistory();
    }
  }, [session, fetchHistory]);

  const loadMessages = async (feedbackId: string) => {
    setLoadingMessages(feedbackId);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}`);
      const data = await res.json();
      if (data.success) {
        setFeedbacks((prev) =>
          prev.map((f) => (f.id === feedbackId ? { ...f, messages: data.feedback.messages } : f))
        );
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoadingMessages(null);
    }
  };

  const handleExpand = async (feedbackId: string) => {
    if (expandedId === feedbackId) {
      setExpandedId(null);
      setNewMessage('');
      return;
    }
    setExpandedId(feedbackId);
    setNewMessage('');
    await loadMessages(feedbackId);
  };

  const sendMessage = async (feedbackId: string) => {
    if (!newMessage.trim()) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbacks((prev) =>
          prev.map((f) =>
            f.id === feedbackId
              ? {
                  ...f,
                  messages: [...(f.messages || []), data.message],
                  _count: { messages: f._count.messages + 1 },
                }
              : f
          )
        );
        setNewMessage('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const saveEdit = async (feedbackId: string) => {
    if (!editMessage.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit_message', newMessage: editMessage.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbacks((prev) =>
          prev.map((f) =>
            f.id === feedbackId
              ? { ...f, message: editMessage.trim(), originalMessage: f.originalMessage || f.message }
              : f
          )
        );
        setEditingId(null);
        setEditMessage('');
      }
    } catch (error) {
      console.error('Failed to save edit:', error);
    } finally {
      setSavingEdit(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleSort = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  // Not logged in
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
        <div className="fixed inset-0 bg-grid opacity-20" />
        <div className="fixed inset-0 radial-gradient" />
        <div className="relative container max-w-2xl pt-20 pb-20 px-4 text-center">
          <History className="w-16 h-16 text-gray-700 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-3">Sign In Required</h1>
          <p className="text-gray-500 mb-6">You need to be signed in to view your feedback history.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-sm rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/20"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      <div className="fixed inset-0 bg-grid opacity-20" />
      <div className="fixed inset-0 radial-gradient" />

      <div className="relative container max-w-3xl pt-8 sm:pt-12 pb-20 px-4">
        {/* Back link */}
        <Link
          href="/feedback"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors font-medium mb-6 touch-target"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Feedback
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              My <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">Feedback</span>
            </h1>
            <p className="text-gray-500">
              {feedbacks.length} submission{feedbacks.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Sort */}
            <button
              onClick={toggleSort}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/4 border border-white/8 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white transition-all"
            >
              {sortOrder === 'desc' ? (
                <><ArrowDown className="w-3.5 h-3.5" /> Latest First</>
              ) : (
                <><ArrowUp className="w-3.5 h-3.5" /> Oldest First</>
              )}
            </button>

            {/* New Feedback */}
            <Link
              href="/feedback"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25 text-sm font-medium transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </Link>
          </div>
        </div>

        {/* Feedback List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No feedback yet</p>
            <p className="text-gray-600 text-sm mb-6">You haven&apos;t submitted any feedback.</p>
            <Link
              href="/feedback"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-sm rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              Send Feedback
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((fb) => {
              const catConf = categoryConfig[fb.category] || categoryConfig.GENERAL;
              const statConf = statusConfig[fb.status] || statusConfig.OPEN;
              const CatIcon = catConf.icon;
              const StatIcon = statConf.icon;
              const isExpanded = expandedId === fb.id;

              return (
                <div
                  key={fb.id}
                  className={`rounded-xl border transition-all duration-200 ${
                    isExpanded
                      ? 'border-white/[0.12] bg-white/[0.04]'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
                  }`}
                >
                  {/* Header row */}
                  <button
                    type="button"
                    onClick={() => handleExpand(fb.id)}
                    className="w-full flex items-center gap-3 p-4 text-left touch-target"
                  >
                    <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-${catConf.color}-500/10`}>
                      <CatIcon className={`w-4 h-4 text-${catConf.color}-400`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate mb-0.5">{fb.subject}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                        <span>{catConf.label}</span>
                        <span>&middot;</span>
                        <span>{formatDate(fb.createdAt)}</span>
                        {fb.claimedBy && (
                          <>
                            <span>&middot;</span>
                            <span className="inline-flex items-center gap-1 text-indigo-400">
                              <UserCheck className="w-3 h-3" />
                              {fb.claimedBy.name || 'Admin'}
                            </span>
                          </>
                        )}
                        {fb._count.messages > 0 && (
                          <>
                            <span>&middot;</span>
                            <span className="inline-flex items-center gap-1 text-teal-400">
                              <MessageCircle className="w-3 h-3" />
                              {fb._count.messages}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-${statConf.color}-500/10 text-${statConf.color}-400 border border-${statConf.color}-500/20`}>
                      <StatIcon className="w-3 h-3" />
                      {statConf.label}
                    </span>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-white/[0.06] pt-4 space-y-4">
                      {/* Message with edit */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-gray-500 font-medium">Your message:</p>
                          <div className="flex items-center gap-2">
                            {fb.originalMessage && (
                              <button
                                type="button"
                                onClick={() => setShowOriginal(showOriginal === fb.id ? null : fb.id)}
                                className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
                              >
                                {showOriginal === fb.id ? 'Hide original' : 'Show original'}
                              </button>
                            )}
                            {fb.status !== 'CLOSED' && editingId !== fb.id && (
                              <button
                                type="button"
                                onClick={() => { setEditingId(fb.id); setEditMessage(fb.message); }}
                                className="inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-blue-400 transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </button>
                            )}
                          </div>
                        </div>
                        {showOriginal === fb.id && fb.originalMessage && (
                          <div className="text-sm text-gray-500 whitespace-pre-wrap leading-relaxed bg-amber-500/[0.03] rounded-lg p-3 border border-amber-500/10 mb-2">
                            <p className="text-[10px] text-amber-400/70 font-medium mb-1">Original message:</p>
                            {fb.originalMessage}
                          </div>
                        )}
                        {editingId === fb.id ? (
                          <div>
                            <textarea
                              value={editMessage}
                              onChange={(e) => setEditMessage(e.target.value.slice(0, 5000))}
                              rows={5}
                              className="w-full px-3 py-2 rounded-lg bg-white/4 border border-blue-500/30 text-sm text-white placeholder-gray-600 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all resize-y min-h-[100px]"
                            />
                            <div className="flex items-center justify-end gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => { setEditingId(null); setEditMessage(''); }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all"
                              >
                                <X className="w-3 h-3" />
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => saveEdit(fb.id)}
                                disabled={!editMessage.trim() || savingEdit || editMessage.trim() === fb.message}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {savingEdit ? (
                                  <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                                ) : (
                                  <Save className="w-3 h-3" />
                                )}
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                            {fb.message}
                            {fb.originalMessage && (
                              <p className="text-[10px] text-gray-600 mt-2 italic">Edited</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Messages / Chat section */}
                      <div className="mt-4 pt-4 border-t border-white/[0.06]">
                        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-teal-400" />
                          Conversation ({fb._count.messages})
                        </h4>

                        {loadingMessages === fb.id ? (
                          <div className="flex items-center justify-center py-6">
                            <div className="w-4 h-4 border-2 border-white/20 border-t-teal-400 rounded-full animate-spin" />
                          </div>
                        ) : fb.messages && fb.messages.length > 0 ? (
                          <div className="space-y-3 mb-4 max-h-80 overflow-y-auto pr-1">
                            {fb.messages.map((msg) => (
                              <div
                                key={msg.id}
                                className={`rounded-lg p-3 text-sm ${
                                  msg.isAdmin
                                    ? 'bg-indigo-500/[0.07] border border-indigo-500/15 ml-4'
                                    : 'bg-white/[0.03] border border-white/[0.06] mr-4'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className={`text-xs font-semibold ${msg.isAdmin ? 'text-indigo-400' : 'text-gray-300'}`}>
                                    {msg.isAdmin && <Shield className="w-3 h-3 inline mr-1" />}
                                    {msg.isAdmin ? (msg.user.name || 'Admin') : 'You'}
                                  </span>
                                  <span className="text-[10px] text-gray-600">{formatDate(msg.createdAt)}</span>
                                </div>
                                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600 mb-4">No messages yet. Send a message to follow up.</p>
                        )}

                        {/* Send message */}
                        {fb.status !== 'CLOSED' && (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  sendMessage(fb.id);
                                }
                              }}
                              placeholder="Type a message..."
                              className="flex-1 h-10 px-3 rounded-lg bg-white/4 border border-white/8 text-sm text-white placeholder-gray-600 focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/20 outline-none transition-all"
                              maxLength={2000}
                            />
                            <button
                              onClick={() => sendMessage(fb.id)}
                              disabled={!newMessage.trim() || sendingMessage}
                              className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-500/15 text-teal-400 border border-teal-500/20 hover:bg-teal-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {sendingMessage ? (
                                <div className="w-4 h-4 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        )}

                        {fb.status === 'CLOSED' && (
                          <p className="text-xs text-gray-600 italic">This feedback has been closed.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
