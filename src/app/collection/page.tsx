import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CollectionClient } from './CollectionClient';
import Link from 'next/link';
import { Layers, Package, Sparkles } from 'lucide-react';

async function getCollection() {
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

  const pulls = await prisma.pull.findMany({
    where: {
      userId: user.id,
      cartItem: null,
    },
    include: {
      card: {
        select: {
          id: true,
          name: true,
          imageUrlGatherer: true,
          coinValue: true,
          rarity: true,
        },
      },
      box: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { timestamp: 'desc' },
  });

  let cart;
  try {
    cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          select: { pullId: true },
        },
      },
    });
  } catch (error) {
    cart = null;
  }

  const cartPullIds = new Set(cart?.items.map(item => item.pullId) || []);
  
  return pulls.map(pull => ({
    id: pull.id,
    card: pull.card
      ? {
          id: pull.card.id,
          name: pull.card.name,
          imageUrlGatherer: pull.card.imageUrlGatherer,
          coinValue: pull.card.coinValue,
          rarity: pull.card.rarity,
        }
      : null,
    box: pull.box,
    cartItem: cartPullIds.has(pull.id) ? { id: 'temp' } : null,
  }));
}

export default async function CollectionPage() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const pullsWithCart = await getCollection();

  // Calculate stats
  const totalCards = pullsWithCart.length;
  const totalValue = pullsWithCart.reduce((sum, p) => sum + (p.card?.coinValue || 0), 0);
  const rarities = pullsWithCart.reduce((acc, p) => {
    const rarity = p.card?.rarity || 'Common';
    acc[rarity] = (acc[rarity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />

      <div className="relative container py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full glass text-sm">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="text-gray-300">Your Cards</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="text-white">My </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Collection</span>
          </h1>
          <p className="text-gray-400 text-lg">Manage your card collection</p>
        </div>

        {/* Stats Bar */}
        {totalCards > 0 && (
          <div className="glass-strong rounded-2xl p-6 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{totalCards}</div>
                <div className="text-sm text-gray-400">Total Cards</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">{totalValue.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Total Value</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{rarities['Rare'] || 0}</div>
                <div className="text-sm text-gray-400">Rare Cards</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-500">{rarities['Mythic'] || rarities['Legendary'] || 0}</div>
                <div className="text-sm text-gray-400">Mythic/Legendary</div>
              </div>
            </div>
          </div>
        )}

        {pullsWithCart.length === 0 ? (
          <div className="glass-strong rounded-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20">
              <Package className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Collection Empty</h2>
            <p className="text-gray-400 mb-6">Open some boxes to start building your collection!</p>
            <Link 
              href="/boxes" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl transition-all hover:scale-105"
            >
              <Sparkles className="w-5 h-5" />
              Browse Boxes
            </Link>
          </div>
        ) : (
          <CollectionClient pulls={pullsWithCart} />
        )}
      </div>
    </div>
  );
}
