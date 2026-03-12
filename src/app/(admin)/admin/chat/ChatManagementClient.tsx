'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Ban,
  Clock,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  X,
  MoreVertical,
  UserPlus,
} from 'lucide-react';

interface ChatLogEntry {
  id: string;
  originalId: string;
  content: string;
  userId: string;
  userName: string;
  userRole: string;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedById: string | null;
  deleteReason: string | null;
  createdAt: string;
}

interface BanEntry {
  id: string;
  userId: string;
  userName: string;
  userImage: string | null;
  type: 'TIMEOUT' | 'BAN';
  reason: string | null;
  active: boolean;
  expiresAt: string | null;
  isExpired: boolean;
  createdBy: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SearchUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
}

// Quick action menu for usernames in chat log
function UserActionMenu({
  userId,
  userName,
  userRole,
  onAction,
}: {
  userId: string;
  userName: string;
  userRole: string;
  onAction: (result: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (userRole === 'ADMIN') return null;

  const handleTimeout = async (duration: string) => {
    setProcessing(true);
    try {
      const res = await fetch('/api/chat/admin/timeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, duration }),
      });
      const data = await res.json();
      if (data.success) {
        const labels: Record<string, string> = { '1h': '1 hour', '1d': '1 day', '1w': '1 week' };
        onAction(`${userName} timed out for ${labels[duration]}`);
      } else {
        onAction(data.error || 'Failed to timeout');
      }
    } catch {
      onAction('Failed to timeout user');
    }
    setProcessing(false);
    setOpen(false);
  };

  const handleBan = async () => {
    if (!confirm(`Permanently ban ${userName} from chat?`)) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/chat/admin/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        onAction(`${userName} banned from chat`);
      } else {
        onAction(data.error || 'Failed to ban');
      }
    } catch {
      onAction('Failed to ban user');
    }
    setProcessing(false);
    setOpen(false);
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={processing}
        className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded text-gray-600 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
        aria-label="User actions"
      >
        <MoreVertical className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-50 w-44 py-1 rounded-lg bg-gray-900 border border-white/[0.1] shadow-xl shadow-black/40">
          <button onClick={() => handleTimeout('1h')} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-300 hover:bg-white/[0.06] hover:text-yellow-400 transition-colors">
            <Clock className="w-3.5 h-3.5" /> Timeout 1 hour
          </button>
          <button onClick={() => handleTimeout('1d')} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-300 hover:bg-white/[0.06] hover:text-yellow-400 transition-colors">
            <Clock className="w-3.5 h-3.5" /> Timeout 1 day
          </button>
          <button onClick={() => handleTimeout('1w')} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-300 hover:bg-white/[0.06] hover:text-yellow-400 transition-colors">
            <Clock className="w-3.5 h-3.5" /> Timeout 1 week
          </button>
          <div className="h-px bg-white/[0.06] my-1" />
          <button onClick={handleBan} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
            <Ban className="w-3.5 h-3.5" /> Ban permanently
          </button>
        </div>
      )}
    </div>
  );
}

export default function ChatManagementClient() {
  const [tab, setTab] = useState<'log' | 'bans'>('log');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Chat log state
  const [logs, setLogs] = useState<ChatLogEntry[]>([]);
  const [logPagination, setLogPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [logLoading, setLogLoading] = useState(false);
  const [deletedOnly, setDeletedOnly] = useState(false);
  const [logSearch, setLogSearch] = useState('');

  // Bans state
  const [bans, setBans] = useState<BanEntry[]>([]);
  const [bansLoading, setBansLoading] = useState(false);
  const [includeExpired, setIncludeExpired] = useState(false);

  // Ban user search state
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<SearchUser[]>([]);
  const [userSearching, setUserSearching] = useState(false);
  const [banningUserId, setBanningUserId] = useState<string | null>(null);

  // Auto-clear action feedback
  useEffect(() => {
    if (!actionFeedback) return;
    const t = setTimeout(() => setActionFeedback(null), 3000);
    return () => clearTimeout(t);
  }, [actionFeedback]);

  // Load chat log
  const loadLogs = useCallback(
    async (page = 1) => {
      setLogLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '50',
        });
        if (deletedOnly) params.set('deletedOnly', 'true');
        if (logSearch) params.set('search', logSearch);

        const res = await fetch(`/api/chat/admin/log?${params}`);
        const data = await res.json();
        if (data.success) {
          setLogs(data.logs);
          setLogPagination(data.pagination);
        }
      } catch (error) {
        console.error('Failed to load chat log:', error);
      }
      setLogLoading(false);
    },
    [deletedOnly, logSearch],
  );

  // Load bans
  const loadBans = useCallback(async () => {
    setBansLoading(true);
    try {
      const params = new URLSearchParams();
      if (includeExpired) params.set('includeExpired', 'true');

      const res = await fetch(`/api/chat/admin/bans?${params}`);
      const data = await res.json();
      if (data.success) {
        setBans(data.bans);
      }
    } catch (error) {
      console.error('Failed to load bans:', error);
    }
    setBansLoading(false);
  }, [includeExpired]);

  // Load on mount / tab switch
  useEffect(() => {
    if (tab === 'log') {
      loadLogs(1);
    } else {
      loadBans();
    }
  }, [tab, loadLogs, loadBans]);

  // Search users for banning
  const searchUsers = async () => {
    if (!userSearch.trim()) return;
    setUserSearching(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(userSearch.trim())}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setUserResults(data.users.filter((u: SearchUser) => u.role !== 'ADMIN'));
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    }
    setUserSearching(false);
  };

  // Ban user from search
  const banUserFromSearch = async (userId: string, userName: string, action: 'ban' | '1h' | '1d' | '1w') => {
    if (action === 'ban' && !confirm(`Permanently ban ${userName} from chat?`)) return;
    setBanningUserId(userId);
    try {
      if (action === 'ban') {
        const res = await fetch('/api/chat/admin/ban', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        const data = await res.json();
        if (data.success) {
          setActionFeedback(`${userName} banned from chat`);
          loadBans();
        } else {
          setActionFeedback(data.error || 'Failed to ban');
        }
      } else {
        const res = await fetch('/api/chat/admin/timeout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, duration: action }),
        });
        const data = await res.json();
        if (data.success) {
          const labels: Record<string, string> = { '1h': '1 hour', '1d': '1 day', '1w': '1 week' };
          setActionFeedback(`${userName} timed out for ${labels[action]}`);
          loadBans();
        } else {
          setActionFeedback(data.error || 'Failed to timeout');
        }
      }
    } catch {
      setActionFeedback('Action failed');
    }
    setBanningUserId(null);
  };

  // Remove ban
  const removeBan = async (banId: string) => {
    try {
      const res = await fetch(`/api/chat/admin/bans?banId=${banId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setBans((prev) => prev.filter((b) => b.id !== banId));
        setActionFeedback('Ban removed');
      }
    } catch (error) {
      console.error('Failed to remove ban:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Action feedback toast */}
      {actionFeedback && (
        <div className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-xs text-purple-300 text-center">
          {actionFeedback}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('log')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'log'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Chat Log
        </button>
        <button
          onClick={() => setTab('bans')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'bans'
              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
              : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <Ban className="w-4 h-4" />
          Bans & Timeouts
          {bans.filter((b) => b.active && !b.isExpired).length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-[10px] font-bold text-white">
              {bans.filter((b) => b.active && !b.isExpired).length}
            </span>
          )}
        </button>
      </div>

      {/* ─── Chat Log Tab ─── */}
      {tab === 'log' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={deletedOnly}
                onChange={(e) => setDeletedOnly(e.target.checked)}
                className="rounded bg-white/[0.06] border-white/[0.1]"
              />
              Deleted only
            </label>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by username or message..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadLogs(1); }}
                className="h-8 w-64 px-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <button
              onClick={() => loadLogs(1)}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-medium text-white transition-colors"
            >
              Search
            </button>
          </div>

          {/* Log table */}
          <div className="glass-strong rounded-xl overflow-hidden">
            {logLoading ? (
              <div className="flex items-center justify-center p-12 text-gray-500 text-sm">
                Loading...
              </div>
            ) : logs.length === 0 ? (
              <div className="flex items-center justify-center p-12 text-gray-500 text-sm">
                No messages found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Message
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className={`hover:bg-white/[0.02] ${log.isDeleted ? 'opacity-60' : ''}`}
                      >
                        <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-medium ${
                                log.userRole === 'ADMIN' ? 'text-red-400' : 'text-gray-300'
                              }`}
                            >
                              {log.userName}
                            </span>
                            {log.userRole === 'ADMIN' && (
                              <Shield className="w-3 h-3 text-red-400" />
                            )}
                            <UserActionMenu
                              userId={log.userId}
                              userName={log.userName}
                              userRole={log.userRole}
                              onAction={(msg) => { setActionFeedback(msg); loadBans(); }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <p
                            className={`text-xs max-w-md truncate ${
                              log.isDeleted ? 'text-gray-600 line-through' : 'text-gray-300'
                            }`}
                          >
                            {log.content}
                          </p>
                        </td>
                        <td className="px-4 py-2.5">
                          {log.isDeleted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-[10px] font-medium text-red-400">
                              <Trash2 className="w-3 h-3" />
                              Deleted
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-500/10 text-[10px] font-medium text-green-400">
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {logPagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Page {logPagination.page} of {logPagination.totalPages} ({logPagination.total} messages)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => loadLogs(logPagination.page - 1)}
                  disabled={logPagination.page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <button
                  onClick={() => loadLogs(logPagination.page + 1)}
                  disabled={logPagination.page >= logPagination.totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Bans & Timeouts Tab ─── */}
      {tab === 'bans' && (
        <div className="space-y-4">
          {/* Ban a user by search */}
          <div className="glass-strong rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <UserPlus className="w-4 h-4 text-red-400" />
              Ban or timeout a user
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by username or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') searchUsers(); }}
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50"
                />
              </div>
              <button
                onClick={searchUsers}
                disabled={!userSearch.trim() || userSearching}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-xs font-medium text-white transition-colors"
              >
                {userSearching ? 'Searching...' : 'Find User'}
              </button>
            </div>

            {/* User search results */}
            {userResults.length > 0 && (
              <div className="divide-y divide-white/[0.04] rounded-lg bg-white/[0.02] overflow-hidden">
                {userResults.map((user) => (
                  <div key={user.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      {user.image ? (
                        <img src={user.image} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-400">{(user.name || '?')[0].toUpperCase()}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-medium text-white">{user.name || 'Unknown'}</span>
                        <span className="text-xs text-gray-500 ml-2">{user.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => banUserFromSearch(user.id, user.name || 'User', '1h')}
                        disabled={banningUserId === user.id}
                        className="px-2.5 py-1 rounded-md text-[11px] font-medium text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 transition-colors disabled:opacity-40"
                      >
                        1h
                      </button>
                      <button
                        onClick={() => banUserFromSearch(user.id, user.name || 'User', '1d')}
                        disabled={banningUserId === user.id}
                        className="px-2.5 py-1 rounded-md text-[11px] font-medium text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 transition-colors disabled:opacity-40"
                      >
                        1d
                      </button>
                      <button
                        onClick={() => banUserFromSearch(user.id, user.name || 'User', '1w')}
                        disabled={banningUserId === user.id}
                        className="px-2.5 py-1 rounded-md text-[11px] font-medium text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 transition-colors disabled:opacity-40"
                      >
                        1w
                      </button>
                      <button
                        onClick={() => banUserFromSearch(user.id, user.name || 'User', 'ban')}
                        disabled={banningUserId === user.id}
                        className="px-2.5 py-1 rounded-md text-[11px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-40"
                      >
                        Ban
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={includeExpired}
                onChange={(e) => setIncludeExpired(e.target.checked)}
                className="rounded bg-white/[0.06] border-white/[0.1]"
              />
              Show expired / inactive
            </label>
          </div>

          <div className="glass-strong rounded-xl overflow-hidden">
            {bansLoading ? (
              <div className="flex items-center justify-center p-12 text-gray-500 text-sm">
                Loading...
              </div>
            ) : bans.length === 0 ? (
              <div className="flex items-center justify-center p-12 text-gray-500 text-sm">
                No bans or timeouts found
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {bans.map((ban) => (
                  <div
                    key={ban.id}
                    className={`flex items-center justify-between px-4 py-3 ${
                      !ban.active || ban.isExpired ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* User avatar */}
                      {ban.userImage ? (
                        <img
                          src={ban.userImage}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-400">
                            {(ban.userName || '?')[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{ban.userName}</span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              ban.type === 'BAN'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}
                          >
                            {ban.type === 'BAN' ? (
                              <>
                                <Ban className="w-3 h-3" /> Banned
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" /> Timeout
                              </>
                            )}
                          </span>
                          {ban.isExpired && (
                            <span className="text-[10px] text-gray-500">expired</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span>By {ban.createdBy}</span>
                          <span>·</span>
                          <span>{formatDate(ban.createdAt)}</span>
                          {ban.expiresAt && (
                            <>
                              <span>·</span>
                              <span>Until {formatDate(ban.expiresAt)}</span>
                            </>
                          )}
                        </div>
                        {ban.reason && (
                          <p className="text-xs text-gray-400 mt-0.5">Reason: {ban.reason}</p>
                        )}
                      </div>
                    </div>
                    {ban.active && !ban.isExpired && (
                      <button
                        onClick={() => removeBan(ban.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08] transition-colors"
                      >
                        <X className="w-3 h-3" />
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
