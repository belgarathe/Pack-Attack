import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Package, Trophy, Coins, TrendingUp, Swords, ShoppingCart, ChevronRight, Sparkles } from 'lucide-react';

export default async function UserDashboard() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect('/login');
  }

  const stats = {
    pulls: await prisma.pull.count({ where: { userId: user.id } }),
    battles: await prisma.battleParticipant.count({ where: { userId: user.id } }),
    wins: await prisma.battle.count({ where: { winnerId: user.id } }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />

      <div className="relative container py-12">
        {/* Welcome Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full glass text-sm">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-gray-300">Dashboard</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{user.name || 'Player'}</span>!
          </h1>
          <p className="text-gray-400">Manage your collection and join battles</p>
        </div>

        {/* Balance Card */}
        <div className="mb-8">
          <div className="glass-strong rounded-2xl p-6 md:p-8 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-2">Your Balance</p>
                <div className="flex items-center gap-3">
                  <Coins className="w-10 h-10 text-amber-400" />
                  <span className="text-4xl md:text-5xl font-bold text-white">{user.coins.toLocaleString()}</span>
                  <span className="text-gray-400 text-xl">coins</span>
                </div>
              </div>
              <Link 
                href="/purchase-coins"
                className="hidden md:inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold rounded-xl transition-all hover:scale-105"
              >
                Buy Coins
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Pulls</p>
                <p className="text-3xl font-bold text-white">{stats.pulls}</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Swords className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Battles Joined</p>
                <p className="text-3xl font-bold text-white">{stats.battles}</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Battles Won</p>
                <p className="text-3xl font-bold text-white">{stats.wins}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="glass-strong rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
            <div className="space-y-3">
              <Link 
                href="/battles"
                className="group flex items-center justify-between p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Swords className="w-5 h-5 text-purple-400" />
                  <span className="font-semibold text-white">Join Battles</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/boxes"
                className="group flex items-center justify-between p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-blue-400" />
                  <span className="font-semibold text-white">Browse Boxes</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/collection"
                className="group flex items-center justify-between p-4 rounded-xl bg-gray-800/50 border border-gray-700 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                  <span className="font-semibold text-white">View Collection</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/cart"
                className="group flex items-center justify-between p-4 rounded-xl bg-gray-800/50 border border-gray-700 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-5 h-5 text-gray-400" />
                  <span className="font-semibold text-white">Shopping Cart</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="glass-strong rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gray-800/50">
                <Trophy className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-gray-400 mb-4">No recent activity</p>
              <Link 
                href="/battles"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                Start a battle <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
