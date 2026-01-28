import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for batch selling specific cards
const batchSellSchema = z.object({
  pullIds: z.array(z.string()).optional(), // If provided, only sell these cards
});

export async function POST(request: NextRequest) {
  try {
    // PERFORMANCE: Parse body and session in parallel
    const [session, body] = await Promise.all([
      getCurrentSession(),
      request.json().catch(() => ({})), // Allow empty body for sell-all
    ]);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pullIds } = batchSellSchema.parse(body);

    // PERFORMANCE: Single optimized query to get user and pulls
    // Uses select to only fetch needed fields
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build where clause - either specific pulls or all non-cart pulls
    const whereClause = pullIds && pullIds.length > 0
      ? {
          id: { in: pullIds },
          userId: user.id,
          cartItem: null,
        }
      : {
          userId: user.id,
          cartItem: null,
        };

    // PERFORMANCE: Only select fields we need for the sale
    const pulls = await prisma.pull.findMany({
      where: whereClause,
      select: {
        id: true,
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

    if (pulls.length === 0) {
      return NextResponse.json({ error: 'No cards to sell' }, { status: 400 });
    }

    // PERFORMANCE: Calculate totals in a single pass
    let totalCoins = 0;
    const saleHistoryData: Array<{
      userId: string;
      cardId: string;
      cardName: string;
      cardImage: string | null;
      coinsReceived: number;
    }> = [];

    for (const pull of pulls) {
      if (pull.card) {
        const coinValue = Number(pull.card.coinValue);
        totalCoins += coinValue;
        saleHistoryData.push({
          userId: user.id,
          cardId: pull.card.id,
          cardName: pull.card.name,
          cardImage: pull.card.imageUrlGatherer || pull.card.imageUrlScryfall || null,
          coinsReceived: coinValue,
        });
      }
    }

    // PERFORMANCE: Execute all operations in a single transaction
    const pullIdsToDelete = pulls.map(p => p.id);
    
    const [, updatedUser] = await prisma.$transaction([
      // Delete pulls by ID (more efficient than re-querying)
      prisma.pull.deleteMany({
        where: { id: { in: pullIdsToDelete } },
      }),
      // Add coins to user
      prisma.user.update({
        where: { id: user.id },
        data: { coins: { increment: totalCoins } },
        select: { coins: true },
      }),
      // Create sale history entries for all cards
      prisma.saleHistory.createMany({
        data: saleHistoryData,
      }),
    ]);

    return NextResponse.json({
      success: true,
      cardsSold: pulls.length,
      coinsReceived: totalCoins,
      newBalance: Number(updatedUser.coins),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error selling cards:', error);
    return NextResponse.json({ error: 'Failed to sell cards' }, { status: 500 });
  }
}


