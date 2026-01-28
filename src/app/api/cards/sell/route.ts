import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const sellCardSchema = z.object({
  pullId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    // PERFORMANCE: Parse body and session in parallel
    const [session, body] = await Promise.all([
      getCurrentSession(),
      request.json(),
    ]);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pullId } = sellCardSchema.parse(body);

    // PERFORMANCE: Single query to get pull with user validation and card data
    // This replaces two separate queries (user + pull)
    const pull = await prisma.pull.findFirst({
      where: {
        id: pullId,
        user: { email: session.user.email },
      },
      select: {
        id: true,
        userId: true,
        cartItem: { select: { id: true } },
        card: {
          select: {
            id: true,
            name: true,
            coinValue: true,
            imageUrlGatherer: true,
            imageUrlScryfall: true,
          },
        },
      },
    });

    if (!pull) {
      return NextResponse.json({ error: 'Pull not found or not owned' }, { status: 404 });
    }

    if (pull.cartItem) {
      return NextResponse.json({ error: 'Cannot sell card that is in cart' }, { status: 400 });
    }

    if (!pull.card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const coinValue = Number(pull.card.coinValue);
    const cardName = pull.card.name;
    const cardImage = pull.card.imageUrlGatherer || pull.card.imageUrlScryfall || null;
    const cardId = pull.card.id;

    // PERFORMANCE: Execute all operations in a single transaction
    const [, updatedUser] = await prisma.$transaction([
      prisma.pull.delete({
        where: { id: pullId },
      }),
      prisma.user.update({
        where: { id: pull.userId },
        data: { coins: { increment: coinValue } },
        select: { coins: true },
      }),
      prisma.saleHistory.create({
        data: {
          userId: pull.userId,
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
      newBalance: Number(updatedUser.coins),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error selling card:', error);
    return NextResponse.json({ error: 'Failed to sell card' }, { status: 500 });
  }
}

