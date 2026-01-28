import { NextRequest, NextResponse } from 'next/server';
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
  pullRate: z.number().min(0).max(100),
  coinValue: z.number().min(0.01),
  sourceGame: z.enum(['MAGIC_THE_GATHERING', 'ONE_PIECE', 'POKEMON', 'LORCANA', 'YUGIOH', 'FLESH_AND_BLOOD']),
});

const cardsSchema = z.object({
  cards: z.array(cardSchema),
});

// Helper function to create JSON response
function jsonResponse(data: object, status: number = 200) {
  // Use Response.json() - the native method
  return Response.json(data, { status });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return jsonResponse({ error: 'Unauthorized', success: false }, 401);
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'ADMIN') {
      return jsonResponse({ error: 'Forbidden', success: false }, 403);
    }

    const { id } = await context.params;
    const box = await prisma.box.findUnique({
      where: { id },
    });

    if (!box) {
      return jsonResponse({ error: 'Box not found', success: false }, 404);
    }

    const body = await request.json();
    const { cards: rawCards } = cardsSchema.parse(body);

    // Ensure all cards have at least minimal pull rate (0.001)
    const cards = rawCards.map(card => ({
      ...card,
      pullRate: card.pullRate === 0 ? 0.001 : card.pullRate,
    }));

    // Get existing cards to calculate total pull rate
    const existingCards = await prisma.card.findMany({
      where: { boxId: id },
    });

    // Calculate total pull rate (existing + new)
    const existingTotal = existingCards.reduce((sum, card) => sum + Number(card.pullRate), 0);
    const newTotal = cards.reduce((sum, card) => sum + card.pullRate, 0);
    const totalRate = existingTotal + newTotal;
    
    // Allow adding cards with minimal rates even if it slightly exceeds 100%
    if (totalRate > 105) {
      return jsonResponse({
        error: `Total pull rate is too high: ${totalRate.toFixed(3)}% (max 105% allowed). Current: ${existingTotal.toFixed(3)}% + New: ${newTotal.toFixed(3)}%`,
        success: false
      }, 400);
    }
    
    // Warn if total is not exactly 100%
    let warning = null;
    if (Math.abs(totalRate - 100) > 0.001) {
      if (totalRate > 100) {
        warning = `⚠️ Total pull rate is ${totalRate.toFixed(3)}% (exceeds 100%). You MUST adjust card rates to total exactly 100%.`;
      } else {
        warning = `⚠️ Total pull rate is ${totalRate.toFixed(3)}% (under 100%). Please adjust card rates to total exactly 100%.`;
      }
    }

    // Check for duplicate cards before creating
    const existingScryfallIds = new Set(existingCards.map(card => card.scryfallId));
    const newCardsScryfallIds = new Set<string>();
    const duplicatesInRequest: string[] = [];
    const duplicatesWithExisting: string[] = [];
    const cardsToAdd = [];

    for (const card of cards) {
      if (newCardsScryfallIds.has(card.scryfallId)) {
        duplicatesInRequest.push(card.name);
      } else if (existingScryfallIds.has(card.scryfallId)) {
        duplicatesWithExisting.push(card.name);
      } else {
        newCardsScryfallIds.add(card.scryfallId);
        cardsToAdd.push(card);
      }
    }

    // If no new cards to add after filtering duplicates
    if (cardsToAdd.length === 0) {
      if (duplicatesWithExisting.length > 0) {
        const errorMessage = `All cards already exist in the box: ${duplicatesWithExisting.join(', ')}`;
        return jsonResponse({ 
          error: errorMessage,
          duplicates: duplicatesWithExisting,
          success: false
        }, 400);
      }
      return jsonResponse({ 
        error: 'No valid cards to add after removing duplicates',
        success: false
      }, 400);
    }

    // PERFORMANCE: Batch create all cards at once using createMany
    try {
      const cardDataToCreate = cardsToAdd.map(cardData => ({
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
      }));

      await prisma.card.createMany({
        data: cardDataToCreate,
        skipDuplicates: true,
      });

      // Fetch the created cards for the response
      const createdCards = await prisma.card.findMany({
        where: {
          boxId: box.id,
          scryfallId: { in: cardsToAdd.map(c => c.scryfallId) },
        },
      });

      if (createdCards.length === 0) {
        return jsonResponse({ 
          error: 'Failed to create cards - no cards were created',
          success: false
        }, 400);
      }

      // Update box image to highest coin value card (if we added any cards)
      if (cardsToAdd.length > 0) {
        const highestValueCard = cardsToAdd.reduce((highest, card) =>
          card.coinValue > highest.coinValue ? card : highest
        );

        await prisma.box.update({
          where: { id },
          data: {
            imageUrl: highestValueCard.imageUrlGatherer,
          },
        });
      }

      // Prepare successful response
      const response: Record<string, unknown> = { 
        success: true, 
        cards: createdCards,
        addedCount: createdCards.length
      };

      if (warning) {
        response.warning = warning;
      }

      if (duplicatesWithExisting.length > 0) {
        response.skippedExisting = duplicatesWithExisting;
        response.message = `Added ${createdCards.length} cards. ${duplicatesWithExisting.length} cards were already in the box and skipped.`;
      }

      if (duplicatesInRequest.length > 0) {
        response.skippedDuplicates = duplicatesInRequest;
      }

      return jsonResponse(response, 200);
    } catch (error) {
      console.error('Failed to batch create cards:', error);
      return jsonResponse({ 
        error: 'Failed to create cards', 
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }, 400);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonResponse({ error: 'Invalid input', details: error.issues, success: false }, 400);
    }
    console.error('Error adding cards to box:', error);
    return jsonResponse({ error: 'Failed to add cards', success: false }, 500);
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return jsonResponse({ error: 'Unauthorized', success: false }, 401);
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'ADMIN') {
      return jsonResponse({ error: 'Forbidden', success: false }, 403);
    }

    const { id } = await context.params;
    
    const cards = await prisma.card.findMany({
      where: { boxId: id },
      orderBy: [
        { coinValue: 'desc' },
        { pullRate: 'desc' }
      ],
    });

    return jsonResponse({ cards, success: true }, 200);
  } catch (error) {
    console.error('Error fetching cards:', error);
    return jsonResponse({ error: 'Failed to fetch cards', success: false }, 500);
  }
}
