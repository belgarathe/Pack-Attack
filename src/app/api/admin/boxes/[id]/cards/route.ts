import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const cardSchema = z.object({
  scryfallId: z.string(),
  name: z.string(),
  setName: z.string(),
  setCode: z.string(),
  collectorNumber: z.string(),
  rarity: z.string(),
  imageUrlGatherer: z.string(),
  imageUrlScryfall: z.string().optional(),
  pullRate: z.number().min(0.001).max(100),
  coinValue: z.number().int().min(1),
  sourceGame: z.enum(['MAGIC_THE_GATHERING', 'ONE_PIECE', 'POKEMON', 'LORCANA']),
});

const cardsSchema = z.object({
  cards: z.array(cardSchema),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const box = await prisma.box.findUnique({
      where: { id },
    });

    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    const body = await request.json();
    const { cards } = cardsSchema.parse(body);

    // Get existing cards to calculate total pull rate
    const existingCards = await prisma.card.findMany({
      where: { boxId: id },
    });

    // Calculate total pull rate (existing + new)
    const existingTotal = existingCards.reduce((sum, card) => sum + Number(card.pullRate), 0);
    const newTotal = cards.reduce((sum, card) => sum + card.pullRate, 0);
    const totalRate = existingTotal + newTotal;
    
    if (Math.abs(totalRate - 100) > 0.001) {
      return NextResponse.json(
        { error: `Total pull rate must be exactly 100%. Current: ${totalRate.toFixed(3)}% (Existing: ${existingTotal.toFixed(3)}% + New: ${newTotal.toFixed(3)}%)` },
        { status: 400 }
      );
    }

    // Create cards
    const createdCards = await Promise.all(
      cards.map((cardData) =>
        prisma.card.create({
          data: {
            scryfallId: cardData.scryfallId,
            name: cardData.name,
            setName: cardData.setName,
            setCode: cardData.setCode,
            collectorNumber: cardData.collectorNumber,
            rarity: cardData.rarity,
            imageUrlGatherer: cardData.imageUrlGatherer,
            imageUrlScryfall: cardData.imageUrlScryfall || cardData.imageUrlGatherer,
            pullRate: cardData.pullRate,
            coinValue: cardData.coinValue,
            sourceGame: cardData.sourceGame,
            boxId: box.id,
            colors: [],
            type: '',
          },
        })
      )
    );

    // Update box image to highest coin value card
    const highestValueCard = cards.reduce((highest, card) =>
      card.coinValue > highest.coinValue ? card : highest
    );

    await prisma.box.update({
      where: { id },
      data: {
        imageUrl: highestValueCard.imageUrlGatherer,
      },
    });

    return NextResponse.json({ success: true, cards: createdCards });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error adding cards to box:', error);
    return NextResponse.json({ error: 'Failed to add cards' }, { status: 500 });
  }
}

