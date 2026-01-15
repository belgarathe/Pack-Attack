import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Coins, Package, ArrowLeft, Edit } from 'lucide-react';
import { EditBoxClient } from './EditBoxClient';

async function getBox(boxId: string) {
  const box = await prisma.box.findUnique({
    where: { id: boxId },
    include: {
      cards: {
        orderBy: { coinValue: 'desc' },
      },
    },
  });

  if (!box) return null;

  return {
    ...box,
    price: Number(box.price),
    cards: box.cards.map(card => ({
      ...card,
      pullRate: Number(card.pullRate),
      coinValue: Number(card.coinValue),
    })),
  };
}

export default async function EditBoxPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;
  const box = await getBox(id);

  if (!box) {
    redirect('/admin/boxes');
  }

  return <EditBoxClient box={box} />;
}

