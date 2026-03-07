'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Bug,
  Lightbulb,
  Swords,
  Package,
  Store,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  UserCheck,
  UserX,
  ArrowUp,
  ArrowDown,
  Send,
  MessageCircle,
  Shield,
  Search,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Activity,
  StickyNote,
  UserPlus,
  Check,
  History,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────

type ClaimedBy = { id: string; name: string | null; email: string };
type FeedbackUser = { id: string; name: string | null; email: string };

type FeedbackMsg = {
  id: string;
  content: string;
  isAdmin: boolean;
  createdAt: string;
  user: { id: string; name: string | null; email: string; role: string };
};

type ActivityLog = {
  id: string;
  action: string;
  details: Record<string, string> | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
};

type Feedback = {
  id: string;
  userId: string | null;
  email: string | null;
  category: string;
  experience: number | null;
  subject: string;
  message: string;
  originalMessage: string | null;
  status: string;
  priority: string;
  adminNotes: string | null;
  userAgent: string | null;
  claimedById: string | null;
  claimedBy: ClaimedBy | null;
  claimedAt: string | null;
  assignedToId: string | null;
  assignedTo: ClaimedBy | null;
  assignedAt: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  user: FeedbackUser | null;
  _count: { messages: number };
  createdAt: string;
  updatedAt: string;
  messages?: FeedbackMsg[];
  activities?: ActivityLog[];
};

type AdminUser = { id: string; name: string | null; email: string };

// ─── Config ──────────────────────────────────────────────

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

const priorityConfig: Record<string, { label: string; color: string; dot: string }> = {
  LOW: { label: 'Low', color: 'gray', dot: 'bg-gray-400' },
  MEDIUM: { label: 'Medium', color: 'blue', dot: 'bg-blue-400' },
  HIGH: { label: 'High', color: 'amber', dot: 'bg-amber-400' },
  URGENT: { label: 'Urgent', color: 'red', dot: 'bg-red-400 animate-pulse' },
};

const experienceLabels: Record<number, string> = { 1: 'Terrible', 2: 'Poor', 3: 'Okay', 4: 'Good', 5: 'Excellent' };

// ─── Helpers ─────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.round((seconds % 86400) / 3600);
  return h > 0 ? `${d} day${d > 1 ? 's' : ''} ${h} hr` : `${d} day${d > 1 ? 's' : ''}`;
}

function getResponseTimeColor(seconds: number | null): string {
  if (seconds === null) return 'text-gray-500';
  if (seconds < 14400) return 'text-green-400';
  if (seconds < 86400) return 'text-amber-400';
  return 'text-red-400';
}

function getActivityDescription(activity: ActivityLog): string {
  const name = activity.user.name || activity.user.email;
  const details = activity.details;
  switch (activity.action) {
    case 'CLAIMED': return `${name} claimed this ticket`;
    case 'UNCLAIMED': return `${name} released this ticket`;
    case 'STATUS_CHANGED': return `${name} changed status from ${details?.from || '?'} to ${details?.to || '?'}`;
    case 'CATEGORY_CHANGED': {
      const from = categoryConfig[details?.from || '']?.label || details?.from;
      const to = categoryConfig[details?.to || '']?.label || details?.to;
      return `${name} moved from ${from} to ${to}`;
    }
    case 'PRIORITY_CHANGED': return `${name} changed priority from ${details?.from || '?'} to ${details?.to || '?'}`;
    case 'ASSIGNED': return details?.newAssigneeId ? `${name} assigned this ticket` : `${name} unassigned this ticket`;
    case 'NOTE_ADDED': return `${name} updated admin notes`;
    case 'MESSAGE_SENT': return `${name} sent a message`;
    default: return `${name} performed ${activity.action}`;
  }
}

// ─── Component ───────────────────────────────────────────

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showActivity, setShowActivity] = useState<string | null>(null);
  const [showOriginalId, setShowOriginalId] = useState<string | null>(null);
  const [loadingActivity, setLoadingActivity] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [notesSaving, setNotesSaving] = useState<string | null>(null);
  const [notesSaved, setNotesSaved] = useState<string | null>(null);
  const notesTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [bulkValue, setBulkValue] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchQuery); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch admin users
  useEffect(() => {
    fetch('/api/feedback?admins=true')
      .then((r) => r.json())
      .then((d) => { if (d.success) setAdminUsers(d.admins); })
      .catch(console.error);
  }, []);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '15', sort: sortOrder });
      if (filterStatus) params.set('status', filterStatus);
      if (filterCategory) params.set('category', filterCategory);
      if (filterPriority) params.set('priority', filterPriority);
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`/api/feedback?${params}`);
      const data = await res.json();
      if (data.success) {
        setFeedbacks(data.feedbacks);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterCategory, filterPriority, debouncedSearch, sortOrder]);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);
  useEffect(() => { setSelectedIds(new Set()); }, [page, filterStatus, filterCategory, filterPriority, debouncedSearch, sortOrder]);

  // ─── Actions ─────────────────────────────────────────

  const loadMessages = async (feedbackId: string) => {
    setLoadingMessages(feedbackId);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}`);
      const data = await res.json();
      if (data.success) {
        setFeedbacks((prev) => prev.map((f) => (f.id === feedbackId ? { ...f, messages: data.feedback.messages } : f)));
      }
    } catch (error) { console.error('Failed to load messages:', error); }
    finally { setLoadingMessages(null); }
  };

  const loadActivity = async (feedbackId: string) => {
    setLoadingActivity(feedbackId);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/activity`);
      const data = await res.json();
      if (data.success) {
        setFeedbacks((prev) => prev.map((f) => (f.id === feedbackId ? { ...f, activities: data.activities } : f)));
      }
    } catch (error) { console.error('Failed to load activity:', error); }
    finally { setLoadingActivity(null); }
  };

  const handleExpand = async (feedbackId: string) => {
    if (expandedId === feedbackId) { setExpandedId(null); setNewMessage(''); setShowActivity(null); return; }
    setExpandedId(feedbackId);
    setNewMessage('');
    setShowActivity(null);
    const fb = feedbacks.find((f) => f.id === feedbackId);
    if (fb) setEditingNotes((prev) => ({ ...prev, [feedbackId]: fb.adminNotes || '' }));
    await loadMessages(feedbackId);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/feedback/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbacks((prev) => prev.map((f) => f.id === id ? { ...f, status: newStatus, claimedBy: data.feedback.claimedBy ?? f.claimedBy, claimedById: data.feedback.claimedById ?? f.claimedById, assignedTo: data.feedback.assignedTo ?? f.assignedTo, assignedToId: data.feedback.assignedToId ?? f.assignedToId } : f));
      }
    } catch (error) { console.error('Failed to update feedback:', error); }
    finally { setUpdatingId(null); }
  };

  const handleClaim = async (id: string, action: 'claim' | 'unclaim') => {
    setClaimingId(id);
    try {
      const res = await fetch(`/api/feedback/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbacks((prev) => prev.map((f) => f.id === id ? { ...f, claimedById: data.feedback.claimedById ?? null, claimedBy: data.feedback.claimedBy ?? null, claimedAt: data.feedback.claimedAt ?? null, status: data.feedback.status } : f));
      }
    } catch (error) { console.error('Failed to claim/unclaim feedback:', error); }
    finally { setClaimingId(null); }
  };

  const reassignCategory = async (id: string, newCategory: string) => {
    try {
      const res = await fetch(`/api/feedback/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reassign_category', newCategory }) });
      const data = await res.json();
      if (res.ok && data.success) setFeedbacks((prev) => prev.map((f) => (f.id === id ? { ...f, category: newCategory } : f)));
    } catch (error) { console.error('Failed to reassign category:', error); }
  };

  const updatePriority = async (id: string, priority: string) => {
    try {
      const res = await fetch(`/api/feedback/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_priority', priority }) });
      const data = await res.json();
      if (res.ok && data.success) setFeedbacks((prev) => prev.map((f) => (f.id === id ? { ...f, priority } : f)));
    } catch (error) { console.error('Failed to update priority:', error); }
  };

  const assignAdmin = async (id: string, assignToUserId: string | null) => {
    try {
      const res = await fetch(`/api/feedback/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'assign', assignToUserId }) });
      const data = await res.json();
      if (res.ok && data.success) setFeedbacks((prev) => prev.map((f) => f.id === id ? { ...f, assignedToId: data.feedback.assignedToId ?? null, assignedTo: data.feedback.assignedTo ?? null, assignedAt: data.feedback.assignedAt ?? null } : f));
    } catch (error) { console.error('Failed to assign admin:', error); }
  };

  const saveNotes = async (id: string, notes: string) => {
    setNotesSaving(id); setNotesSaved(null);
    try {
      const res = await fetch(`/api/feedback/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_notes', adminNotes: notes }) });
      if (res.ok) {
        setFeedbacks((prev) => prev.map((f) => (f.id === id ? { ...f, adminNotes: notes || null } : f)));
        setNotesSaved(id);
        setTimeout(() => setNotesSaved((prev) => (prev === id ? null : prev)), 2000);
      }
    } catch (error) { console.error('Failed to save notes:', error); }
    finally { setNotesSaving(null); }
  };

  const handleNotesChange = (id: string, value: string) => {
    setEditingNotes((prev) => ({ ...prev, [id]: value }));
    if (notesTimeoutRef.current[id]) clearTimeout(notesTimeoutRef.current[id]);
    notesTimeoutRef.current[id] = setTimeout(() => saveNotes(id, value), 500);
  };

  const sendMessage = async (feedbackId: string) => {
    if (!newMessage.trim()) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: newMessage.trim() }) });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbacks((prev) => prev.map((f) => f.id === feedbackId ? { ...f, messages: [...(f.messages || []), data.message], _count: { messages: f._count.messages + 1 }, firstResponseAt: f.firstResponseAt || new Date().toISOString() } : f));
        setNewMessage('');
      }
    } catch (error) { console.error('Failed to send message:', error); }
    finally { setSendingMessage(false); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === feedbacks.length ? new Set() : new Set(feedbacks.map((f) => f.id)));
  };
  const executeBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    setBulkProcessing(true);
    try {
      const res = await fetch('/api/feedback/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: bulkAction, ids: Array.from(selectedIds), value: bulkValue }) });
      const data = await res.json();
      if (res.ok && data.success) { setSelectedIds(new Set()); setBulkAction(''); setBulkValue(''); fetchFeedback(); }
    } catch (error) { console.error('Bulk action failed:', error); }
    finally { setBulkProcessing(false); }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const toggleSort = () => { setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc')); setPage(1); };

  const getResponseSeconds = (fb: Feedback): number | null => {
    if (!fb.firstResponseAt) return null;
    return Math.round((new Date(fb.firstResponseAt).getTime() - new Date(fb.createdAt).getTime()) / 1000);
  };

  // ─── Render ──────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />

      <div className="relative container py-8 sm:py-12">
        {/* Back + Header */}
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors font-medium mb-6 touch-target">
          <ArrowLeft className="w-4 h-4" />
          Back to Admin
        </Link>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">Feedback</span> Management
            </h1>
            <p className="text-gray-500">{total} total feedback{total !== 1 ? 's' : ''}</p>
          </div>
          <Link href="/admin/feedback/analytics" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm font-medium text-gray-300 hover:bg-white/[0.08] hover:text-white hover:border-white/[0.15] transition-all">
            <BarChart3 className="w-4 h-4 text-teal-400" />
            Analytics
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filters:</span>
          </div>

          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search feedback..." className="w-full h-9 pl-10 pr-3 rounded-lg bg-white/4 border border-white/8 text-sm text-gray-300 placeholder-gray-600 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all" />
          </div>

          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="h-9 px-3 rounded-lg bg-white/4 border border-white/8 text-sm text-gray-300 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all [&>option]:bg-gray-900 [&>option]:text-gray-100">
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="CLAIMED">Claimed</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }} className="h-9 px-3 rounded-lg bg-white/4 border border-white/8 text-sm text-gray-300 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all [&>option]:bg-gray-900 [&>option]:text-gray-100">
            <option value="">All Categories</option>
            <option value="BUG_REPORT">Bug Reports</option>
            <option value="FEATURE_REQUEST">Feature Requests</option>
            <option value="GENERAL">General</option>
            <option value="BATTLE_ISSUE">Battle Issues</option>
            <option value="PACK_ISSUE">Pack Issues</option>
            <option value="SHOP_ISSUE">Shop Issues</option>
          </select>

          <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }} className="h-9 px-3 rounded-lg bg-white/4 border border-white/8 text-sm text-gray-300 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all [&>option]:bg-gray-900 [&>option]:text-gray-100">
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          <button onClick={toggleSort} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/4 border border-white/8 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white transition-all">
            {sortOrder === 'desc' ? <><ArrowDown className="w-3.5 h-3.5" /> Latest First</> : <><ArrowUp className="w-3.5 h-3.5" /> Oldest First</>}
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No feedback found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Select all */}
            <div className="flex items-center gap-3 px-4 py-2">
              <button type="button" onClick={toggleSelectAll} className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${selectedIds.size === feedbacks.length && feedbacks.length > 0 ? 'bg-teal-500 border-teal-500' : 'border-white/20 hover:border-white/40'}`}>
                {selectedIds.size === feedbacks.length && feedbacks.length > 0 && <Check className="w-3 h-3 text-white" />}
              </button>
              <span className="text-xs text-gray-500">{selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}</span>
            </div>

            {feedbacks.map((fb) => {
              const catConf = categoryConfig[fb.category] || categoryConfig.GENERAL;
              const statConf = statusConfig[fb.status] || statusConfig.OPEN;
              const prioConf = priorityConfig[fb.priority] || priorityConfig.MEDIUM;
              const CatIcon = catConf.icon;
              const StatIcon = statConf.icon;
              const isExpanded = expandedId === fb.id;
              const isSelected = selectedIds.has(fb.id);

              return (
                <div
                  key={fb.id}
                  className={`rounded-xl border transition-all duration-200 ${
                    isExpanded ? 'border-white/[0.12] bg-white/[0.04]'
                    : isSelected ? 'border-teal-500/30 bg-teal-500/[0.03]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
                  }`}
                >
                  {/* ── Row header ── */}
                  <div className="flex items-center gap-3 p-4">
                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleSelect(fb.id); }} className={`shrink-0 w-4 h-4 rounded border transition-all flex items-center justify-center ${isSelected ? 'bg-teal-500 border-teal-500' : 'border-white/20 hover:border-white/40'}`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </button>

                    <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${prioConf.dot}`} title={`Priority: ${prioConf.label}`} />

                    <button type="button" onClick={() => handleExpand(fb.id)} className="flex-1 flex items-center gap-3 text-left touch-target min-w-0">
                      <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-${catConf.color}-500/10`}>
                        <CatIcon className={`w-4 h-4 text-${catConf.color}-400`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate mb-0.5">{fb.subject}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                          <span>{catConf.label}</span>
                          <span>&middot;</span>
                          <span>{formatDate(fb.createdAt)}</span>
                          {(fb.user?.email || fb.email) && (
                            <>
                              <span>&middot;</span>
                              <span className="truncate max-w-[150px]">{fb.user?.name || fb.user?.email || fb.email}</span>
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

                      {fb.experience && (
                        <div className="hidden sm:flex items-center gap-1 shrink-0 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/15">
                          <span className="text-[11px] font-semibold text-amber-400">{fb.experience}/5 {experienceLabels[fb.experience]}</span>
                        </div>
                      )}

                      <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-${statConf.color}-500/10 text-${statConf.color}-400 border border-${statConf.color}-500/20`}>
                        <StatIcon className="w-3 h-3" />
                        {statConf.label}
                      </span>
                    </button>
                  </div>

                  {/* ── Expanded detail ── */}
                  {isExpanded && (
                    <div className="border-t border-white/[0.06]">
                      {/* User message */}
                      <div className="px-5 pt-4 pb-3">
                        <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{fb.message}</div>
                        {fb.originalMessage && fb.originalMessage !== fb.message && (
                          <div className="mt-2">
                            <button
                              onClick={() => setShowOriginalId(showOriginalId === fb.id ? null : fb.id)}
                              className="text-[11px] text-amber-400/70 hover:text-amber-400 transition-colors flex items-center gap-1"
                            >
                              <History className="w-3 h-3" />
                              {showOriginalId === fb.id ? 'Hide original' : 'Show original message'}
                              <span className="text-amber-500/40 ml-1">(edited by user)</span>
                            </button>
                            {showOriginalId === fb.id && (
                              <div className="mt-2 p-3 rounded-lg bg-amber-500/[0.05] border border-amber-500/10 text-sm text-amber-200/70 whitespace-pre-wrap leading-relaxed">
                                <span className="text-[10px] uppercase tracking-wider text-amber-500/50 font-semibold block mb-1">Original message</span>
                                {fb.originalMessage}
                              </div>
                            )}
                          </div>
                        )}
                        {fb.userAgent && (
                          <div className="mt-3 text-xs text-gray-600 bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                            <span className="font-medium text-gray-500">User Agent:</span> {fb.userAgent}
                          </div>
                        )}
                      </div>

                      {/* ── Ticket controls — organized into labeled sections ── */}
                      <div className="px-5 py-4 bg-white/[0.015] border-t border-b border-white/[0.04]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                          {/* Left column: Status + Ownership */}
                          <div className="space-y-4">
                            {/* Status */}
                            <div>
                              <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2 block">Status</span>
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(statusConfig).map(([key, conf]) => {
                                  if (key === 'CLAIMED') return null; // Handled via Ownership section
                                  const Icon = conf.icon;
                                  const isCurrent = fb.status === key;
                                  return (
                                    <button key={key} onClick={() => updateStatus(fb.id, key)} disabled={isCurrent || updatingId === fb.id}
                                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        isCurrent ? `bg-${conf.color}-500/20 text-${conf.color}-400 border border-${conf.color}-500/30` : 'bg-white/[0.03] text-gray-400 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white'
                                      } disabled:opacity-50`}>
                                      <Icon className="w-3 h-3" />{conf.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Ownership: Claim + Assign */}
                            <div>
                              <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2 block">Ownership</span>
                              <div className="space-y-2">
                                {/* Claim row */}
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-500 w-16 shrink-0">Claimed:</span>
                                  {fb.claimedBy ? (
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex items-center gap-1.5 text-xs text-indigo-400 font-medium">
                                        <UserCheck className="w-3.5 h-3.5" />
                                        {fb.claimedBy.name || fb.claimedBy.email}
                                      </span>
                                      <button
                                        onClick={() => handleClaim(fb.id, 'unclaim')}
                                        disabled={claimingId === fb.id}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-red-400 bg-red-500/10 border border-red-500/15 hover:bg-red-500/20 hover:border-red-500/25 transition-all disabled:opacity-50"
                                      >
                                        <UserX className="w-3 h-3" />
                                        {claimingId === fb.id ? 'Releasing...' : 'Release'}
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleClaim(fb.id, 'claim')}
                                      disabled={claimingId === fb.id}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all disabled:opacity-50"
                                    >
                                      <UserCheck className="w-3.5 h-3.5" />
                                      {claimingId === fb.id ? 'Claiming...' : 'Claim Ticket'}
                                    </button>
                                  )}
                                </div>

                                {/* Assign row */}
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-500 w-16 shrink-0">Assigned:</span>
                                  <select value={fb.assignedToId || ''} onChange={(e) => assignAdmin(fb.id, e.target.value || null)} className="h-8 px-2 rounded-lg bg-white/4 border border-white/8 text-xs text-gray-300 focus:border-teal-500/40 outline-none transition-all [&>option]:bg-gray-900 [&>option]:text-gray-100">
                                    <option value="">Unassigned</option>
                                    {adminUsers.map((admin) => <option key={admin.id} value={admin.id}>{admin.name || admin.email}</option>)}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right column: Category + Priority + Response time */}
                          <div className="space-y-4">
                            {/* Category + Priority */}
                            <div>
                              <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2 block">Classification</span>
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Category:</span>
                                  <select value={fb.category} onChange={(e) => reassignCategory(fb.id, e.target.value)} className="h-8 px-2 rounded-lg bg-white/4 border border-white/8 text-xs text-gray-300 focus:border-teal-500/40 outline-none transition-all [&>option]:bg-gray-900 [&>option]:text-gray-100">
                                    {Object.entries(categoryConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                                  </select>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Priority:</span>
                                  <select value={fb.priority} onChange={(e) => updatePriority(fb.id, e.target.value)} className="h-8 px-2 rounded-lg bg-white/4 border border-white/8 text-xs text-gray-300 focus:border-teal-500/40 outline-none transition-all [&>option]:bg-gray-900 [&>option]:text-gray-100">
                                    {Object.entries(priorityConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Response time info */}
                            <div>
                              <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2 block">Response Time</span>
                              {(() => {
                                const secs = getResponseSeconds(fb);
                                if (secs !== null) {
                                  return (
                                    <div className="flex items-center gap-2">
                                      <Clock className={`w-3.5 h-3.5 ${getResponseTimeColor(secs)}`} />
                                      <span className={`text-sm font-medium ${getResponseTimeColor(secs)}`}>
                                        First reply in {formatDuration(secs)}
                                      </span>
                                    </div>
                                  );
                                }
                                if (fb.status !== 'CLOSED' && fb.status !== 'RESOLVED') {
                                  return (
                                    <span className="text-xs text-gray-500 italic">Awaiting first admin response</span>
                                  );
                                }
                                return <span className="text-xs text-gray-600">No response recorded</span>;
                              })()}
                            </div>

                            {/* Admin Notes */}
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <StickyNote className="w-3.5 h-3.5 text-gray-500" />
                                <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Admin Notes</span>
                                {notesSaving === fb.id && <span className="text-[10px] text-gray-500 ml-1">Saving...</span>}
                                {notesSaved === fb.id && <span className="text-[10px] text-green-400 ml-1">Saved</span>}
                              </div>
                              <textarea
                                value={editingNotes[fb.id] ?? fb.adminNotes ?? ''}
                                onChange={(e) => handleNotesChange(fb.id, e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-gray-300 placeholder-gray-600 focus:border-teal-500/30 focus:ring-1 focus:ring-teal-500/15 outline-none transition-all resize-y min-h-[60px]"
                                placeholder="Internal notes (auto-saves)..."
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── Messages ── */}
                      <div className="px-5 pt-4 pb-4">
                        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-teal-400" />
                          Messages ({fb._count.messages})
                        </h4>

                        {loadingMessages === fb.id ? (
                          <div className="flex items-center justify-center py-6">
                            <div className="w-4 h-4 border-2 border-white/20 border-t-teal-400 rounded-full animate-spin" />
                          </div>
                        ) : fb.messages && fb.messages.length > 0 ? (
                          <div className="space-y-3 mb-4 max-h-80 overflow-y-auto pr-1">
                            {fb.messages.map((msg) => (
                              <div key={msg.id} className={`rounded-lg p-3 text-sm ${msg.isAdmin ? 'bg-indigo-500/[0.07] border border-indigo-500/15 ml-4' : 'bg-white/[0.03] border border-white/[0.06] mr-4'}`}>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className={`text-xs font-semibold ${msg.isAdmin ? 'text-indigo-400' : 'text-gray-300'}`}>
                                    {msg.isAdmin && <Shield className="w-3 h-3 inline mr-1" />}
                                    {msg.user.name || msg.user.email}
                                  </span>
                                  <span className="text-[10px] text-gray-600">{formatDate(msg.createdAt)}</span>
                                </div>
                                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600 mb-4">No messages yet. Start the conversation.</p>
                        )}

                        <div className="flex gap-2">
                          <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(fb.id); } }}
                            placeholder="Type a message to the user..."
                            className="flex-1 h-10 px-3 rounded-lg bg-white/4 border border-white/8 text-sm text-white placeholder-gray-600 focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/20 outline-none transition-all" maxLength={2000} />
                          <button onClick={() => sendMessage(fb.id)} disabled={!newMessage.trim() || sendingMessage}
                            className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-500/15 text-teal-400 border border-teal-500/20 hover:bg-teal-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                            {sendingMessage ? <div className="w-4 h-4 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* ── Activity Log ── */}
                      <div className="px-5 py-3 border-t border-white/[0.04]">
                        <button type="button"
                          onClick={() => { if (showActivity === fb.id) { setShowActivity(null); } else { setShowActivity(fb.id); if (!fb.activities) loadActivity(fb.id); } }}
                          className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-300 transition-colors">
                          <Activity className="w-3.5 h-3.5" />
                          Activity Log
                          {showActivity === fb.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {showActivity === fb.id && (
                          <div className="mt-3">
                            {loadingActivity === fb.id ? (
                              <div className="flex items-center justify-center py-4">
                                <div className="w-4 h-4 border-2 border-white/20 border-t-teal-400 rounded-full animate-spin" />
                              </div>
                            ) : fb.activities && fb.activities.length > 0 ? (
                              <div className="space-y-0 ml-2 border-l border-white/[0.06]">
                                {fb.activities.map((act) => (
                                  <div key={act.id} className="flex items-start gap-3 pl-4 py-2 relative">
                                    <div className="absolute left-[-3px] top-3 w-1.5 h-1.5 rounded-full bg-gray-600" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-gray-400">{getActivityDescription(act)}</p>
                                      <p className="text-[10px] text-gray-600 mt-0.5">{formatDate(act.createdAt)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-600 py-2">No activity recorded yet.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-gray-900/95 border border-white/[0.12] shadow-2xl shadow-black/50 backdrop-blur-sm">
            <span className="text-sm font-medium text-white">{selectedIds.size} selected</span>
            <div className="w-px h-6 bg-white/10" />

            <select value={bulkAction} onChange={(e) => { setBulkAction(e.target.value); setBulkValue(''); }} className="h-8 px-2 rounded-lg bg-white/[0.06] border border-white/10 text-xs text-gray-300 outline-none [&>option]:bg-gray-900 [&>option]:text-gray-100">
              <option value="">Choose action...</option>
              <option value="update_status">Change Status</option>
              <option value="reassign_category">Change Category</option>
              <option value="update_priority">Change Priority</option>
              <option value="assign">Assign To</option>
            </select>

            {bulkAction === 'update_status' && (
              <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="h-8 px-2 rounded-lg bg-white/[0.06] border border-white/10 text-xs text-gray-300 outline-none [&>option]:bg-gray-900 [&>option]:text-gray-100">
                <option value="">Select status...</option>
                {Object.entries(statusConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
            )}
            {bulkAction === 'reassign_category' && (
              <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="h-8 px-2 rounded-lg bg-white/[0.06] border border-white/10 text-xs text-gray-300 outline-none [&>option]:bg-gray-900 [&>option]:text-gray-100">
                <option value="">Select category...</option>
                {Object.entries(categoryConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
            )}
            {bulkAction === 'update_priority' && (
              <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="h-8 px-2 rounded-lg bg-white/[0.06] border border-white/10 text-xs text-gray-300 outline-none [&>option]:bg-gray-900 [&>option]:text-gray-100">
                <option value="">Select priority...</option>
                {Object.entries(priorityConfig).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
              </select>
            )}
            {bulkAction === 'assign' && (
              <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="h-8 px-2 rounded-lg bg-white/[0.06] border border-white/10 text-xs text-gray-300 outline-none [&>option]:bg-gray-900 [&>option]:text-gray-100">
                <option value="">Select admin...</option>
                {adminUsers.map((admin) => <option key={admin.id} value={admin.id}>{admin.name || admin.email}</option>)}
              </select>
            )}

            <button onClick={executeBulkAction} disabled={!bulkAction || !bulkValue || bulkProcessing}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-medium hover:bg-teal-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {bulkProcessing ? <div className="w-3 h-3 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" /> : <Check className="w-3 h-3" />}
              Apply
            </button>

            <button onClick={() => { setSelectedIds(new Set()); setBulkAction(''); setBulkValue(''); }}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-white/[0.06] bg-white/[0.02] text-gray-400 hover:bg-white/[0.06] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all touch-target">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-400 tabular-nums px-3">Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-white/[0.06] bg-white/[0.02] text-gray-400 hover:bg-white/[0.06] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all touch-target">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
