import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const sellCardSchema = z.object({
  pullId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting - 100 requests per minute (general limit)
    const rateLimitResult = await rateLimit(request, 'general');
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
    const { pullId } = sellCardSchema.parse(body);

    const pull = await prisma.pull.findUnique({
      where: { id: pullId },
      include: {
        card: true,
        cartItem: true,
      },
    });

    if (!pull || pull.userId !== user.id) {
      return NextResponse.json({ error: 'Pull not found or not owned' }, { status: 404 });
    }

    if (pull.cartItem) {
      return NextResponse.json({ error: 'Cannot sell card that is in cart' }, { status: 400 });
    }

    if (!pull.card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const coinValue = pull.card.coinValue;
    const cardName = pull.card.name;
    const cardImage = pull.card.imageUrlGatherer || pull.card.imageUrlScryfall || null;
    const cardId = pull.card.id;

    // Delete pull, add coins, and create sale history
    const [, updatedUser] = await prisma.$transaction([
      prisma.pull.delete({
        where: { id: pullId },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { coins: { increment: coinValue } },
        select: { coins: true },
      }),
      prisma.saleHistory.create({
        data: {
          userId: user.id,
          cardId: cardId,
          cardName: cardName,
          cardImage: cardImage,
          coinsReceived: coinValue,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      coinsReceived: coinValue,
      newBalance: updatedUser.coins,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error selling card:', error);
    return NextResponse.json({ error: 'Failed to sell card' }, { status: 500 });
  }
}

