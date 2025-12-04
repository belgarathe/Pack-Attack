import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

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

    // Check if user is authenticated
    if (!session?.user?.email) {
      console.error('No session or email found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user with role from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    // Check if user is admin
    if (!user || user.role !== 'ADMIN') {
      console.error('User not admin:', user?.role);
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
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

    if (availableBots.length === 0) {
      // Check if any bots exist at all
      const totalBots = await prisma.user.count({
        where: { isBot: true },
      });
      
      if (totalBots === 0) {
        console.error('No bot users exist in database. Run: npm run create-bots');
        return NextResponse.json(
          { error: 'No bot users exist. Please run the create-bots script.' },
          { status: 400 }
        );
      }
      
      console.error('All bots are already in this battle');
      return NextResponse.json(
        { error: 'All available bots are already in this battle' },
        { status: 400 }
      );
    }

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

    // Revalidate the battle page to show the new bots
    revalidatePath(`/battles/${battleId}`);
    revalidatePath('/battles');

    console.log(`Successfully added ${availableBots.length} bots to battle ${battleId}`);
    return NextResponse.json({ success: true, added: availableBots.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }

    console.error('Add bots error:', error);
    return NextResponse.json({ error: 'Failed to add bots' }, { status: 500 });
  }
}
