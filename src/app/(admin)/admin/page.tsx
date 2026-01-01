import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Package, Swords, Users, Mail, ShieldCheck, Coins, TrendingUp, ShoppingCart } from 'lucide-react';

export default async function AdminDashboard() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const [boxCount, battleCount, userCount, emailCount, verifiedCount, totalCoins, orderCount, pendingOrders] = await Promise.all([
    prisma.box.count(),
    prisma.battle.count(),
    prisma.user.count({ where: { isBot: false } }),
    prisma.emailLog.count(),
    prisma.user.count({ where: { emailVerified: true, isBot: false } }),
    prisma.user.aggregate({ where: { isBot: false }, _sum: { coins: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'PENDING' } }),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />

      <div className="relative container py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full glass text-sm">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span className="text-gray-300">Admin Panel</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="text-white">Admin </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Dashboard</span>
          </h1>
          <p className="text-gray-400 text-lg">Manage your Pack Attack platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          <div className="glass rounded-xl p-4 text-center">
            <Package className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{boxCount}</div>
            <div className="text-xs text-gray-400">Boxes</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Swords className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{battleCount}</div>
            <div className="text-xs text-gray-400">Battles</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Users className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{userCount}</div>
            <div className="text-xs text-gray-400">Users</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{verifiedCount}</div>
            <div className="text-xs text-gray-400">Verified</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Mail className="w-6 h-6 text-pink-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{emailCount}</div>
            <div className="text-xs text-gray-400">Emails Sent</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Coins className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{(totalCoins._sum.coins || 0).toLocaleString()}</div>
            <div className="text-xs text-gray-400">Total Coins</div>
          </div>
        </div>

        {/* Management Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <Link href="/admin/orders" className="glass-strong rounded-2xl p-6 hover:ring-2 hover:ring-green-500/50 transition-all group relative">
            {pendingOrders > 0 && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {pendingOrders}
              </div>
            )}
            <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20">
              <ShoppingCart className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors">Order Management</h3>
            <p className="text-gray-400 text-sm">View and process customer orders.</p>
          </Link>

          <Link href="/admin/boxes" className="glass-strong rounded-2xl p-6 hover:ring-2 hover:ring-blue-500/50 transition-all group">
            <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
              <Package className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">Box Management</h3>
            <p className="text-gray-400 text-sm">Create and manage boxes for users to open.</p>
          </Link>

          <Link href="/admin/users" className="glass-strong rounded-2xl p-6 hover:ring-2 hover:ring-cyan-500/50 transition-all group">
            <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20">
              <Users className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">User Management</h3>
            <p className="text-gray-400 text-sm">View, edit, and manage user accounts.</p>
          </Link>

          <Link href="/admin/emails" className="glass-strong rounded-2xl p-6 hover:ring-2 hover:ring-pink-500/50 transition-all group">
            <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20">
              <Mail className="w-6 h-6 text-pink-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-pink-400 transition-colors">Email Management</h3>
            <p className="text-gray-400 text-sm">Send emails and view email history.</p>
          </Link>

          <Link href="/battles" className="glass-strong rounded-2xl p-6 hover:ring-2 hover:ring-purple-500/50 transition-all group">
            <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20">
              <Swords className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">Battle Management</h3>
            <p className="text-gray-400 text-sm">View and manage ongoing battles.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
