import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CardGame } from '@prisma/client';

// POST - Add cards to a box
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boxId } = await params;
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { shop: true },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SHOP_OWNER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const box = await prisma.box.findUnique({ where: { id: boxId } });
    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    // Check ownership
    if (user.role === 'SHOP_OWNER' && box.createdByShopId !== user.shop?.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { cards } = await req.json();

    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json({ error: 'No cards provided' }, { status: 400 });
    }

    // PERFORMANCE: Batch create all cards at once using createMany
    try {
      const cardDataToCreate = cards.map((card: Record<string, unknown>, index: number) => ({
        // Generate a unique scryfallId if not provided
        scryfallId: (card.scryfallId as string) || `shop-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        name: (card.name as string) || '',
        setName: (card.setName as string) || '',
        setCode: (card.setCode as string) || '',
        collectorNumber: (card.collectorNumber as string) || '',
        rarity: (card.rarity as string) || 'common',
        imageUrlGatherer: (card.imageUrlGatherer as string) || (card.imageUrl as string) || '',
        imageUrlScryfall: (card.imageUrlScryfall as string) || (card.imageUrl as string) || '',
        colors: (card.colors as string[]) || [],
        type: (card.type as string) || 'Unknown',
        pullRate: parseFloat(String(card.pullRate)) || 0,
        coinValue: parseFloat(String(card.coinValue)) || 1,
        sourceGame: ((card.sourceGame as string) || 'MAGIC_THE_GATHERING') as CardGame,
        boxId,
      }));

      const result = await prisma.card.createMany({
        data: cardDataToCreate,
        skipDuplicates: true,
      });

      return NextResponse.json({
        success: true,
        message: `Added ${result.count} cards to box`,
        addedCount: result.count,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to batch create cards:', err);
      return NextResponse.json({
        error: 'Failed to add cards',
        details: errorMessage,
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error adding cards to box:', error);
    return NextResponse.json({ error: 'Failed to add cards' }, { status: 500 });
  }
}

// GET - Get cards for a box
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boxId } = await params;
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { shop: true },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SHOP_OWNER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const box = await prisma.box.findUnique({
      where: { id: boxId },
      include: { cards: true },
    });

    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    // Check ownership
    if (user.role === 'SHOP_OWNER' && box.createdByShopId !== user.shop?.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, cards: box.cards });
  } catch (error) {
    console.error('Error fetching cards:', error);
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}
