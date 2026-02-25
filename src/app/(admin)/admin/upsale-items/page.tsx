import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UpsaleItemsClient } from './UpsaleItemsClient';

export default async function UpsaleItemsPage() {
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

  const items = await prisma.upsellItem.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  const serialized = items.map(item => ({
    ...item,
    price: Number(item.price),
    coinPrice: Number(item.coinPrice),
  }));

  return <UpsaleItemsClient initialItems={serialized} />;
}
