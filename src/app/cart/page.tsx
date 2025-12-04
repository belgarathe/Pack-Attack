import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Coins, Trash2, ShoppingBag } from 'lucide-react';
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

  // Convert Decimal values to plain numbers for serialization
  const serializedItems = cart.items.map(item => ({
    ...item,
    pull: {
      ...item.pull,
      cardValue: item.pull.cardValue ? Number(item.pull.cardValue) : null,
      card: item.pull.card ? {
        ...item.pull.card,
        pullRate: Number(item.pull.card.pullRate),
      } : null,
    },
  }));

  const total = cart.items.reduce((sum, item) => {
    return sum + (item.pull.card?.coinValue || 0);
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
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="container py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-white">Shopping Cart</h1>
          <p className="text-gray-400">Review your items before checkout</p>
        </div>

        {items.length === 0 ? (
          <Card className="border-gray-800 bg-gray-900/50">
            <CardContent className="py-12 text-center">
              <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-gray-600" />
              <p className="text-gray-400">Your cart is empty</p>
            </CardContent>
          </Card>
        ) : (
          <CartClient items={items} total={total} />
        )}
      </div>
    </div>
  );
}

