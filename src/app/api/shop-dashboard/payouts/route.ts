import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const COIN_TO_EURO_RATE = 5; // 5 coins = 1 euro

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { shop: true },
    });

    if (!user || user.role !== 'SHOP_OWNER' || !user.shop) {
      return NextResponse.json({ error: 'Shop owner access required' }, { status: 403 });
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

    return NextResponse.json({
      success: true,
      coinBalance: Number(shop?.coinBalance || 0),
      rate: COIN_TO_EURO_RATE,
      payouts: payouts.map(p => ({
        ...p,
        coinAmount: Number(p.coinAmount),
        euroAmount: Number(p.euroAmount),
      })),
    });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { shop: true },
    });

    if (!user || user.role !== 'SHOP_OWNER' || !user.shop) {
      return NextResponse.json({ error: 'Shop owner access required' }, { status: 403 });
    }

    const shop = await prisma.shop.findUnique({
      where: { id: user.shop.id },
      select: { coinBalance: true },
    });

    const balance = Number(shop?.coinBalance || 0);
    if (balance <= 0) {
      return NextResponse.json({ error: 'No coins available for payout' }, { status: 400 });
    }

    const hasPending = await prisma.shopPayout.findFirst({
      where: { shopId: user.shop.id, status: { in: ['REQUESTED', 'PROCESSING'] } },
    });
    if (hasPending) {
      return NextResponse.json({ error: 'You already have a pending payout request' }, { status: 400 });
    }

    const euroAmount = balance / COIN_TO_EURO_RATE;

    const payout = await prisma.shopPayout.create({
      data: {
        shopId: user.shop.id,
        coinAmount: balance,
        euroAmount,
        status: 'REQUESTED',
      },
    });

    return NextResponse.json({
      success: true,
      payout: {
        ...payout,
        coinAmount: Number(payout.coinAmount),
        euroAmount: Number(payout.euroAmount),
      },
    });
  } catch (error) {
    console.error('Error requesting payout:', error);
    return NextResponse.json({ error: 'Failed to request payout' }, { status: 500 });
  }
}
