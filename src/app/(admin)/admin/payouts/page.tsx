import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Wallet } from 'lucide-react';
import { PayoutsAdminClient } from './PayoutsAdminClient';

export default async function AdminPayoutsPage() {
  const session = await getCurrentSession();
  if (!session?.user?.email) redirect('/login');

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== 'ADMIN') redirect('/dashboard');

  const payouts = await prisma.shopPayout.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      shop: {
        select: {
          id: true,
          name: true,
          taxId: true,
          coinBalance: true,
          owner: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });

  const serialized = payouts.map(p => ({
    ...p,
    coinAmount: Number(p.coinAmount),
    euroAmount: Number(p.euroAmount),
    processedAt: p.processedAt?.toISOString() || null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    shop: {
      ...p.shop,
      coinBalance: Number(p.shop.coinBalance),
    },
  }));

  return (
    <div className="min-h-screen font-display">
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />

      <div className="relative container py-8 md:py-12">
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-sm mb-3">
            <ShieldCheck className="w-4 h-4 text-orange-400" />
            <span className="text-gray-300">Admin</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-2 font-heading">
            <span className="text-white">Shop </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">Payouts</span>
          </h1>
          <p className="text-gray-400">Manage payout requests from shop owners. Review, process, and generate payout slips.</p>
        </div>

        <PayoutsAdminClient initialPayouts={serialized} />
      </div>
    </div>
  );
}
