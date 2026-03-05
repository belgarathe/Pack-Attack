import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

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

    return NextResponse.json({
      success: true,
      payouts: payouts.map(p => ({
        ...p,
        coinAmount: Number(p.coinAmount),
        euroAmount: Number(p.euroAmount),
        shop: {
          ...p.shop,
          coinBalance: Number(p.shop.coinBalance),
        },
      })),
    });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
  }
}
