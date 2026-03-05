import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft, Store, Wallet } from 'lucide-react';
import { PayoutsClient } from './PayoutsClient';

const COIN_TO_EURO_RATE = 5;

export default async function ShopPayoutsPage() {
  const session = await getCurrentSession();
  if (!session?.user?.email) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { shop: true },
  });

  if (!user || user.role !== 'SHOP_OWNER' || !user.shop) {
    redirect('/shop-dashboard');
  }

  const [payouts, shop] = await Promise.all([
    prisma.shopPayout.findMany({
      where: { shopId: user.shop.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.shop.findUnique({
      where: { id: user.shop.id },
      select: { coinBalance: true },
    }),
  ]);

  const serializedPayouts = payouts.map(p => ({
    ...p,
    coinAmount: Number(p.coinAmount),
    euroAmount: Number(p.euroAmount),
    processedAt: p.processedAt?.toISOString() || null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <div className="min-h-screen font-display">
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />
      <div className="fixed bottom-20 left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-float" />

      <div className="relative container py-8 md:py-12">
        <div className="mb-8">
          <Link
            href="/shop-dashboard"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-sm mb-3">
            <Store className="w-4 h-4 text-emerald-400" />
            <span className="text-gray-300">{user.shop.name}</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-2 font-heading">
            <span className="text-white">Payout </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Management</span>
          </h1>
          <p className="text-gray-400">Request payouts for your earned coins. Rate: {COIN_TO_EURO_RATE} coins = 1 EUR.</p>
        </div>

        <PayoutsClient
          initialPayouts={serializedPayouts}
          coinBalance={Number(shop?.coinBalance || 0)}
          rate={COIN_TO_EURO_RATE}
        />
      </div>
    </div>
  );
}
