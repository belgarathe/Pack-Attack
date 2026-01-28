import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SalesHistoryClient } from './SalesHistoryClient';
import Link from 'next/link';
import { Receipt, Coins, TrendingUp, Sparkles } from 'lucide-react';

async function getSalesHistory() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    return [];
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return [];
  }

  // PERFORMANCE: Limit to 200 recent sales to prevent slow page loads
  const sales = await prisma.saleHistory.findMany({
    where: { userId: user.id },
    orderBy: { timestamp: 'desc' },
    take: 200,
  });

  return sales;
}

export default async function SalesHistoryPage() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const rawSales = await getSalesHistory();

  // Convert Decimal to Number for client
  const sales = rawSales.map(sale => ({
    ...sale,
    coinsReceived: Number(sale.coinsReceived),
  }));

  // Calculate stats
  const totalSales = sales.length;
  const totalEarned = sales.reduce((sum, s) => sum + s.coinsReceived, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />

      <div className="relative container py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full glass text-sm">
            <Receipt className="w-4 h-4 text-green-400" />
            <span className="text-gray-300">Transaction History</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="text-white">Sales </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">History</span>
          </h1>
          <p className="text-gray-400 text-lg">View all cards you've sold back to the shop</p>
        </div>

        {/* Stats Bar */}
        {totalSales > 0 && (
          <div className="glass-strong rounded-2xl p-6 mb-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-xl bg-green-500/20">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <div className="text-2xl font-bold text-white">{totalSales}</div>
                <div className="text-sm text-gray-400">Cards Sold</div>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-xl bg-amber-500/20">
                  <Coins className="w-6 h-6 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-400">{totalEarned.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Total Earned</div>
              </div>
            </div>
          </div>
        )}

        {sales.length === 0 ? (
          <div className="glass-strong rounded-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20">
              <Receipt className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No Sales Yet</h2>
            <p className="text-gray-400 mb-6">You haven't sold any cards yet. Sell cards from your collection to earn coins!</p>
            <Link 
              href="/collection" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl transition-all hover:scale-105"
            >
              <Sparkles className="w-5 h-5" />
              View Collection
            </Link>
          </div>
        ) : (
          <SalesHistoryClient sales={sales} />
        )}
      </div>
    </div>
  );
}
