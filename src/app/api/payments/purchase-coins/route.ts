import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const purchaseCoinsSchema = z.object({
  amount: z.number().int().min(10).max(1000), // 10 to 1000 euros
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 payment attempts per minute
    const rateLimitResult = await rateLimit(request, 'payment');
    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { amount } = purchaseCoinsSchema.parse(body);

    // 10 coins = 10 euros (1:1 ratio)
    const coinsToAdd = amount;

    // In a real implementation, you would integrate with Stripe or another payment processor here
    // For now, we'll just add the coins directly
    // TODO: Integrate with Stripe payment processing

    await prisma.user.update({
      where: { id: user.id },
      data: { coins: { increment: coinsToAdd } },
    });

    await prisma.transaction.create({
      data: {
        userId: user.id,
        amount: amount,
        coins: coinsToAdd,
        status: 'COMPLETED',
      },
    });

    return NextResponse.json({
      success: true,
      coinsAdded: coinsToAdd,
      newBalance: Number(user.coins) + coinsToAdd,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error purchasing coins:', error);
    return NextResponse.json({ error: 'Failed to purchase coins' }, { status: 500 });
  }
}

