import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    const createdCards = [];
    const failedCards = [];

    for (const card of cards) {
      try {
        // Generate a unique scryfallId if not provided
        const scryfallId = card.scryfallId || `shop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const created = await prisma.card.create({
          data: {
            scryfallId,
            name: card.name,
            setName: card.setName || '',
            setCode: card.setCode || '',
            collectorNumber: card.collectorNumber || '',
            rarity: card.rarity || 'common',
            imageUrlGatherer: card.imageUrlGatherer || card.imageUrl || '',
            imageUrlScryfall: card.imageUrlScryfall || card.imageUrl || '',
            colors: card.colors || [],
            type: card.type || 'Unknown',
            pullRate: parseFloat(card.pullRate) || 0,
            coinValue: parseFloat(card.coinValue) || 1,
            sourceGame: card.sourceGame || 'MAGIC_THE_GATHERING',
            boxId,
          },
        });
        createdCards.push(created);
      } catch (err: any) {
        console.error(`Failed to create card ${card.name}:`, err);
        failedCards.push({
          name: card.name,
          error: err.message,
        });
      }
    }

    if (failedCards.length > 0 && createdCards.length === 0) {
      return NextResponse.json({
        error: 'Failed to add any cards',
        failedCards,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Added ${createdCards.length} cards to box`,
      addedCount: createdCards.length,
      failedCards: failedCards.length > 0 ? failedCards : undefined,
    });
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
