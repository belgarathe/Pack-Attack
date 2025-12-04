import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const addBotsSchema = z.object({
  count: z.number().int().min(1).max(8).default(1),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ battleId?: string }> }
) {
  try {
    const { battleId } = await context.params;

    const session = await getCurrentSession();

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!battleId) {
      return NextResponse.json({ error: 'Battle id missing' }, { status: 400 });
    }

    const payload = await request.json();
    const { count } = addBotsSchema.parse(payload);

    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        participants: {
          select: { userId: true },
        },
      },
    });

    if (!battle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }

    if (battle.status !== 'WAITING') {
      return NextResponse.json({ error: 'Bots can only join waiting battles' }, { status: 400 });
    }

    const spotsLeft = battle.maxParticipants - battle.participants.length;

    if (spotsLeft <= 0) {
      return NextResponse.json({ error: 'Battle is already full' }, { status: 400 });
    }

    if (count > spotsLeft) {
      return NextResponse.json(
        { error: `Only ${spotsLeft} bot slot${spotsLeft === 1 ? '' : 's'} available` },
        { status: 400 }
      );
    }

    const existingIds = battle.participants.map((participant) => participant.userId);

    const availableBots = await prisma.user.findMany({
      where: {
        isBot: true,
        id: { notIn: existingIds },
      },
      orderBy: { createdAt: 'asc' },
      take: count,
    });

    if (availableBots.length < count) {
      return NextResponse.json(
        { error: `Only ${availableBots.length} bot${availableBots.length === 1 ? '' : 's'} available` },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      availableBots.map((bot) =>
        prisma.battleParticipant.create({
          data: {
            battleId,
            userId: bot.id,
          },
        })
      )
    );

    return NextResponse.json({ success: true, added: availableBots.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }

    console.error('Add bots error:', error);
    return NextResponse.json({ error: 'Failed to add bots' }, { status: 500 });
  }
}
