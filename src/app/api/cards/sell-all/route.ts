import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting - 10 requests per minute for bulk operations
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

    // Get all pulls that are NOT in cart
    const pulls = await prisma.pull.findMany({
      where: {
        userId: user.id,
        cartItem: null,
      },
      include: {
        card: true,
      },
    });

    if (pulls.length === 0) {
      return NextResponse.json({ error: 'No cards to sell' }, { status: 400 });
    }

    // Calculate total coins and prepare sale history entries
    let totalCoins = 0;
    const saleHistoryData = pulls
      .filter(pull => pull.card)
      .map(pull => {
        totalCoins += pull.card!.coinValue;
        return {
          userId: user.id,
          cardId: pull.card!.id,
          cardName: pull.card!.name,
          cardImage: pull.card!.imageUrlGatherer || pull.card!.imageUrlScryfall || null,
          coinsReceived: pull.card!.coinValue,
        };
      });

    // Perform all operations in a transaction
    const [, updatedUser] = await prisma.$transaction([
      // Delete all pulls
      prisma.pull.deleteMany({
        where: {
          userId: user.id,
          cartItem: null,
        },
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
      newBalance: updatedUser.coins,
    });
  } catch (error) {
    console.error('Error selling all cards:', error);
    return NextResponse.json({ error: 'Failed to sell cards' }, { status: 500 });
  }
}

