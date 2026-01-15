import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ShoppingCart, Sparkles } from 'lucide-react';
import { CartClient } from './CartClient';

async function getCart() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    return { items: [], total: 0 };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return { items: [], total: 0 };
  }

  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        include: {
          pull: {
            include: {
              card: true,
            },
          },
        },
      },
    },
  });

  if (!cart) {
    return { items: [], total: 0 };
  }

  const serializedItems = cart.items.map(item => ({
    ...item,
    pull: {
      ...item.pull,
      cardValue: item.pull.cardValue ? Number(item.pull.cardValue) : null,
      card: item.pull.card ? {
        ...item.pull.card,
        pullRate: Number(item.pull.card.pullRate),
        coinValue: Number(item.pull.card.coinValue),
      } : null,
    },
  }));

  const total = cart.items.reduce((sum, item) => {
    return sum + (item.pull.card ? Number(item.pull.card.coinValue) : 0);
  }, 0);

  return { items: serializedItems, total };
}

export default async function CartPage() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const { items, total } = await getCart();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />

      <div className="relative container py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full glass text-sm">
            <ShoppingCart className="w-4 h-4 text-blue-400" />
            <span className="text-gray-300">Checkout</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="text-white">Shopping </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Cart</span>
          </h1>
          <p className="text-gray-400 text-lg">Review your items before checkout</p>
        </div>

        {items.length === 0 ? (
          <div className="glass-strong rounded-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
              <ShoppingCart className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Cart Empty</h2>
            <p className="text-gray-400 mb-6">Add cards from your collection to checkout!</p>
            <Link 
              href="/collection" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl transition-all hover:scale-105"
            >
              <Sparkles className="w-5 h-5" />
              View Collection
            </Link>
          </div>
        ) : (
          <CartClient items={items} total={total} />
        )}
      </div>
    </div>
  );
}
