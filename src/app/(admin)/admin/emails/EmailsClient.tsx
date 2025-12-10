'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { 
  Search, 
  Send, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';

type Email = {
  id: string;
  userId: string | null;
  toEmail: string;
  subject: string;
  type: string;
  status: string;
  resendId: string | null;
  error: string | null;
  sentAt: string | Date;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

type User = {
  id: string;
  email: string;
  name: string | null;
};

type Stats = {
  byStatus: Record<string, number>;
  byType: Record<string, number>;
};

type Props = {
  initialEmails: Email[];
  totalEmails: number;
  initialStats: Stats;
  users: User[];
};

export function EmailsClient({ initialEmails, totalEmails, initialStats, users }: Props) {
  const { addToast } = useToast();
  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [total, setTotal] = useState(totalEmails);
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Compose modal
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({
    to: '',
    subject: '',
    html: '',
  });

  const limit = 50;
  const totalPages = Math.ceil(total / limit);

  const fetchEmails = async (newPage = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: newPage.toString(),
        limit: limit.toString(),
      });
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/emails?${params}`);
      const data = await res.json();

      if (res.ok) {
        setEmails(data.emails);
        setTotal(data.pagination.total);
        setStats(data.stats);
        setPage(newPage);
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEmails(1);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(composeData),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({ title: 'Error', description: data.error, variant: 'destructive' });
        return;
      }

      addToast({ title: 'Success', description: 'Email sent successfully' });
      setComposeOpen(false);
      setComposeData({ to: '', subject: '', html: '' });
      fetchEmails(1);
    } catch (error) {
      addToast({ title: 'Error', description: 'Failed to send email', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'FAILED':
      case 'BOUNCED':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-amber-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
        return 'bg-green-500/20 text-green-400';
      case 'FAILED':
      case 'BOUNCED':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-amber-500/20 text-amber-400';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'VERIFICATION':
        return 'bg-blue-500/20 text-blue-400';
      case 'WELCOME':
        return 'bg-green-500/20 text-green-400';
      case 'PASSWORD_RESET':
        return 'bg-amber-500/20 text-amber-400';
      case 'ADMIN_CUSTOM':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <>
      {/* Stats Bar */}
      <div className="glass-strong rounded-2xl p-6 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{total}</div>
            <div className="text-sm text-gray-400">Total Emails</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{stats.byStatus?.SENT || 0}</div>
            <div className="text-sm text-gray-400">Sent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{stats.byStatus?.FAILED || 0}</div>
            <div className="text-sm text-gray-400">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.byType?.VERIFICATION || 0}</div>
            <div className="text-sm text-gray-400">Verification</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats.byType?.WELCOME || 0}</div>
            <div className="text-sm text-gray-400">Welcome</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{stats.byType?.ADMIN_CUSTOM || 0}</div>
            <div className="text-sm text-gray-400">Custom</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass rounded-xl p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search by email or subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              />
            </div>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-pink-500"
          >
            <option value="">All Types</option>
            <option value="VERIFICATION">Verification</option>
            <option value="WELCOME">Welcome</option>
            <option value="PASSWORD_RESET">Password Reset</option>
            <option value="ADMIN_CUSTOM">Custom</option>
            <option value="NOTIFICATION">Notification</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-pink-500"
          >
            <option value="">All Status</option>
            <option value="SENT">Sent</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
            <option value="BOUNCED">Bounced</option>
          </select>
          <button
            type="submit"
            className="px-6 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg transition-colors"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="px-6 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Compose
          </button>
        </form>
      </div>

      {/* Email Log Table */}
      <div className="glass-strong rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-4 text-gray-400 font-medium">Recipient</th>
                <th className="text-left p-4 text-gray-400 font-medium">Subject</th>
                <th className="text-left p-4 text-gray-400 font-medium">Type</th>
                <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                <th className="text-left p-4 text-gray-400 font-medium">Sent At</th>
              </tr>
            </thead>
            <tbody>
              {emails.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No emails found
                  </td>
                </tr>
              ) : (
                emails.map((email) => (
                  <tr key={email.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                    <td className="p-4">
                      <div>
                        <div className="text-white">{email.toEmail}</div>
                        {email.user && (
                          <div className="text-gray-500 text-sm">{email.user.name || 'No name'}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-white truncate max-w-[300px]" title={email.subject}>
                        {email.subject}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(email.type)}`}>
                        {email.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(email.status)}`}>
                        {getStatusIcon(email.status)}
                        {email.status}
                      </span>
                      {email.error && (
                        <div className="text-red-400 text-xs mt-1 truncate max-w-[150px]" title={email.error}>
                          {email.error}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-gray-400 text-sm">
                      {formatDate(email.sentAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-700">
            <div className="text-sm text-gray-400">
              Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchEmails(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-lg bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchEmails(page + 1)}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Compose Email Modal */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-pink-400" />
                Compose Email
              </h2>
              <button onClick={() => setComposeOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">To *</label>
                <select
                  value={composeData.to}
                  onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-pink-500"
                  required
                >
                  <option value="">Select a recipient...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.email}>
                      {user.email} {user.name ? `(${user.name})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Or enter custom email:</p>
                <input
                  type="email"
                  placeholder="custom@example.com"
                  value={composeData.to.includes('@') && !users.some(u => u.email === composeData.to) ? composeData.to : ''}
                  onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                  className="w-full mt-2 px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-pink-500"
                  placeholder="Email subject..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Content (HTML) *</label>
                <textarea
                  required
                  rows={10}
                  value={composeData.html}
                  onChange={(e) => setComposeData({ ...composeData, html: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-pink-500 font-mono text-sm"
                  placeholder="<p>Your email content here...</p>"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can use HTML to format your email. Basic tags like &lt;p&gt;, &lt;h1&gt;, &lt;strong&gt;, &lt;a&gt; are supported.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !composeData.to || !composeData.subject || !composeData.html}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

