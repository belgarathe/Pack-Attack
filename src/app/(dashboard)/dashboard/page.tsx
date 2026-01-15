import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Sparkles } from 'lucide-react';
import { DashboardClient } from './DashboardClient';

export default async function UserDashboard() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      bio: true,
      avatar: true,
      coins: true,
      emailVerified: true,
      shippingName: true,
      shippingAddress: true,
      shippingCity: true,
      shippingZip: true,
      shippingCountry: true,
      shippingPhone: true,
      createdAt: true,
    },
  });

  if (!user) {
    redirect('/login');
  }

  // Fetch user's pulls with card data
  const pulls = await prisma.pull.findMany({
    where: { userId: user.id },
    include: {
      card: {
        select: {
          id: true,
          name: true,
          rarity: true,
          coinValue: true,
          imageUrlGatherer: true,
          sourceGame: true,
        },
      },
      box: {
        select: { name: true },
      },
      cartItem: {
        select: { id: true },
      },
    },
    orderBy: { timestamp: 'desc' },
  });

  // Calculate basic stats
  const stats = {
    pulls: pulls.length,
    battles: await prisma.battleParticipant.count({ where: { userId: user.id } }),
    wins: await prisma.battle.count({ where: { winnerId: user.id } }),
  };

  // Format user for client
  const userForClient = {
    ...user,
    createdAt: user.createdAt.toISOString(),
  };

  // Format pulls for client
  const pullsForClient = pulls.map(pull => ({
    ...pull,
    timestamp: pull.timestamp.toISOString(),
    cardValue: pull.cardValue ? Number(pull.cardValue) : null,
    card: pull.card ? {
      ...pull.card,
      coinValue: Number(pull.card.coinValue),
    } : null,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />

      <div className="relative container py-8 md:py-12">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full glass text-sm">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-gray-300">Dashboard</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{user.name || 'Player'}</span>!
          </h1>
          <p className="text-gray-400">Manage your collection, track orders, and view your stats</p>
        </div>

        <DashboardClient 
          initialUser={userForClient}
          initialPulls={pullsForClient}
          initialStats={stats}
        />
      </div>
    </div>
  );
}
