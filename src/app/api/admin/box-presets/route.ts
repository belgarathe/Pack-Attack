import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for creating a preset
const createPresetSchema = z.object({
  name: z.string().min(1, 'Preset name is required'),
  description: z.string().optional(),
  // Box configuration
  boxName: z.string().min(1),
  boxDescription: z.string().min(1),
  price: z.number().positive(),
  cardsPerPack: z.number().int().positive(),
  games: z.array(z.enum(['MAGIC_THE_GATHERING', 'ONE_PIECE', 'POKEMON', 'LORCANA', 'YUGIOH', 'FLESH_AND_BLOOD'])).min(1),
  // Cards configuration
  cardsConfig: z.array(z.object({
    scryfallId: z.string(),
    name: z.string(),
    setName: z.string(),
    setCode: z.string(),
    collectorNumber: z.string(),
    rarity: z.string(),
    imageUrl: z.string(),
    pullRate: z.number(),
    coinValue: z.number(),
    sourceGame: z.enum(['MAGIC_THE_GATHERING', 'ONE_PIECE', 'POKEMON', 'LORCANA', 'YUGIOH', 'FLESH_AND_BLOOD']),
  })).min(1, 'At least one card is required'),
});

// GET - List all presets
export async function GET() {
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

    const presets = await prisma.boxPreset.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        boxName: true,
        price: true,
        cardsPerPack: true,
        games: true,
        thumbnailUrl: true,
        previewImages: true,
        cardCount: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, presets });
  } catch (error) {
    console.error('Error fetching box presets:', error);
    return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
  }
}

// POST - Create a new preset
export async function POST(request: Request) {
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

    const body = await request.json();
    const data = createPresetSchema.parse(body);

    // Calculate metadata
    const cardCount = data.cardsConfig.length;
    const totalPullRate = data.cardsConfig.reduce((sum, card) => sum + card.pullRate, 0);
    
    // Get preview images (up to 4 cards with highest coin value)
    const sortedCards = [...data.cardsConfig].sort((a, b) => b.coinValue - a.coinValue);
    const previewImages = sortedCards.slice(0, 4).map(card => card.imageUrl);
    const thumbnailUrl = sortedCards[0]?.imageUrl || '';

    const preset = await prisma.boxPreset.create({
      data: {
        name: data.name,
        description: data.description,
        boxName: data.boxName,
        boxDescription: data.boxDescription,
        price: data.price,
        cardsPerPack: data.cardsPerPack,
        games: data.games,
        cardsConfig: data.cardsConfig,
        thumbnailUrl,
        previewImages,
        cardCount,
        totalPullRate,
      },
    });

    return NextResponse.json({ success: true, preset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error creating box preset:', error);
    return NextResponse.json({ error: 'Failed to create preset' }, { status: 500 });
  }
}
