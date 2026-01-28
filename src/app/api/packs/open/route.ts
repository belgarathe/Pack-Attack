import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma, withRetry } from '@/lib/prisma';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const openPackSchema = z.object({
  boxId: z.string(),
  quantity: z.number().int().min(1).max(4),
});

function drawCard(cards: Array<{ id: string; pullRate: number }>) {
  if (!cards || cards.length === 0) {
    throw new Error('No cards available');
  }

  const total = cards.reduce((sum, card) => sum + card.pullRate, 0);
  if (total === 0) {
    throw new Error('Total pull rate is zero');
  }

  const random = Math.random() * total;
  let cumulative = 0;

  for (const card of cards) {
    cumulative += card.pullRate;
    if (random <= cumulative) {
      return card.id;
    }
  }

  return cards[cards.length - 1].id;
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting - 10 pack opens per minute
    const rateLimitResult = await rateLimit(request, 'boxOpening');
    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await withRetry(
      () => prisma.user.findUnique({
        where: { email: session.user.email },
      }),
      'pack-open:findUser'
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { boxId, quantity } = openPackSchema.parse(body);

    const box = await withRetry(
      () => prisma.box.findUnique({
        where: { id: boxId },
        include: {
          cards: true,
        },
      }),
      'pack-open:findBox'
    );

    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    if (box.cards.length === 0) {
      return NextResponse.json({ error: 'Box has no cards' }, { status: 400 });
    }

    const boxPrice = Number(box.price);
    const userCoins = Number(user.coins);
    const totalCost = boxPrice * quantity;
    if (userCoins < totalCost) {
      return NextResponse.json(
        { error: `Insufficient coins. Need ${totalCost.toFixed(2)}, have ${userCoins.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Deduct coins
    await prisma.user.update({
      where: { id: user.id },
      data: { coins: { decrement: totalCost } },
    });

    // Prepare all pulls data upfront (no DB calls in loop)
    const cardsForDrawing = box.cards.map(card => ({
      id: card.id,
      pullRate: Number(card.pullRate),
    }));

    const pullsData: Array<{
      userId: string;
      boxId: string;
      cardId: string;
      cardValue: typeof box.cards[0]['coinValue'];
    }> = [];

    for (let i = 0; i < quantity; i++) {
      for (let j = 0; j < box.cardsPerPack; j++) {
        const cardId = drawCard(cardsForDrawing);
        const card = box.cards.find(c => c.id === cardId);
        
        if (card) {
          pullsData.push({
            userId: user.id,
            boxId: box.id,
            cardId: card.id,
            cardValue: card.coinValue,
          });
        }
      }
    }

    // PERFORMANCE: Batch create all pulls in single transaction
    const createdPulls = await prisma.$transaction(async (tx) => {
      // Create all pulls at once
      await tx.pull.createMany({
        data: pullsData,
      });

      // Fetch them back with card data
      const pulls = await tx.pull.findMany({
        where: {
          userId: user.id,
          boxId: box.id,
          timestamp: { gte: new Date(Date.now() - 5000) }, // Last 5 seconds
        },
        include: { card: true },
        orderBy: { timestamp: 'desc' },
        take: pullsData.length,
      });

      // Update box popularity
      await tx.box.update({
        where: { id: box.id },
        data: { popularity: { increment: quantity } },
      });

      return pulls;
    });

    const pulls = createdPulls;

    // Convert Decimal values to numbers for client
    const pullsForClient = pulls.map(pull => ({
      ...pull,
      cardValue: pull.cardValue ? Number(pull.cardValue) : null,
      card: pull.card ? {
        ...pull.card,
        coinValue: Number(pull.card.coinValue),
        pullRate: Number(pull.card.pullRate),
      } : null,
    }));

    return NextResponse.json({
      success: true,
      pulls: pullsForClient,
      totalCost,
      remainingCoins: userCoins - totalCost,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error opening pack:', error);
    return NextResponse.json({ error: 'Failed to open pack' }, { status: 500 });
  }
}

