import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ShoppingCart } from 'lucide-react';
import { CartClient } from './CartClient';

async function getCart() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    return { items: [], total: 0, upsellCartItems: [] };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return { items: [], total: 0, upsellCartItems: [] };
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
      upsellItems: {
        include: {
          upsellItem: true,
        },
      },
    },
  });

  if (!cart) {
    return { items: [], total: 0, upsellCartItems: [] };
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

  const upsellCartItems = cart.upsellItems.map(ui => ({
    id: ui.id,
    quantity: ui.quantity,
    payWithCoins: ui.payWithCoins,
    upsellItem: {
      id: ui.upsellItem.id,
      name: ui.upsellItem.name,
      imageUrl: ui.upsellItem.imageUrl,
      price: Number(ui.upsellItem.price),
      coinPrice: Number(ui.upsellItem.coinPrice),
    },
  }));

  return { items: serializedItems, total, upsellCartItems };
}

export default async function CartPage() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const { items, total, upsellCartItems } = await getCart();

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

        <CartClient items={items} total={total} upsellCartItems={upsellCartItems} />
      </div>
    </div>
  );
}
