import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const battleSchema = z.object({
  boxId: z.string(),
  entryFee: z.number().int().min(0),
  rounds: z.number().int().min(1),
  battleMode: z.enum(['NORMAL', 'UPSIDE_DOWN', 'JACKPOT']),
  shareMode: z.boolean().default(false),
  maxParticipants: z.number().int().min(2).max(8),
});

export async function GET() {
  try {
    const battles = await prisma.battle.findMany({
      include: {
        creator: { select: { id: true, name: true, email: true } },
        box: true,
        participants: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        winner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Convert Decimal values to numbers
    const serializedBattles = battles.map(battle => ({
      ...battle,
      entryFee: Number(battle.entryFee),
      totalPrize: Number(battle.totalPrize),
      box: battle.box ? {
        ...battle.box,
        price: Number(battle.box.price),
      } : null,
      participants: battle.participants.map(p => ({
        ...p,
        totalValue: Number(p.totalValue),
      })),
    }));

    return NextResponse.json({ success: true, battles: serializedBattles });
  } catch (error) {
    console.error('Error fetching battles:', error);
    return NextResponse.json({ error: 'Failed to fetch battles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting - 5 battle creations per minute
    const rateLimitResult = await rateLimit(request, 'battleCreation');
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
    const data = battleSchema.parse(body);

    const box = await prisma.box.findUnique({
      where: { id: data.boxId },
    });

    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    const battle = await prisma.battle.create({
      data: {
        creatorId: user.id,
        boxId: data.boxId,
        entryFee: data.entryFee,
        rounds: data.rounds,
        battleMode: data.battleMode,
        shareMode: data.shareMode,
        maxParticipants: data.maxParticipants,
        participants: {
          create: {
            userId: user.id,
          },
        },
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        box: true,
        participants: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    // Convert Decimal values to numbers
    const serializedBattle = {
      ...battle,
      entryFee: Number(battle.entryFee),
      totalPrize: Number(battle.totalPrize),
      box: battle.box ? {
        ...battle.box,
        price: Number(battle.box.price),
      } : null,
      participants: battle.participants.map(p => ({
        ...p,
        totalValue: Number(p.totalValue),
      })),
    };

    return NextResponse.json({ success: true, battle: serializedBattle });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Battle creation error:', error);
    return NextResponse.json({ error: 'Failed to create battle' }, { status: 500 });
  }
}
