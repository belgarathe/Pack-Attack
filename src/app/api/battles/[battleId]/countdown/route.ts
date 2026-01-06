import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Start countdown for battle (all participants will see it synchronized)
export async function POST(
  request: Request,
  context: { params: Promise<{ battleId?: string }> }
) {
  try {
    const { battleId } = await context.params;
    const session = await getCurrentSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!battleId) {
      return NextResponse.json({ error: 'Battle ID missing' }, { status: 400 });
    }

    // Get the battle
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });

    if (!battle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }

    // Check if user is the battle creator or an admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isCreator = battle.creatorId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Only the battle creator or admin can start the countdown' }, { status: 403 });
    }

    // Check battle status
    if (battle.status !== 'WAITING') {
      return NextResponse.json({ error: 'Battle has already started or finished' }, { status: 400 });
    }

    // Check if battle is full
    if (battle.participants.length < battle.maxParticipants) {
      return NextResponse.json(
        { error: `Battle needs ${battle.maxParticipants - battle.participants.length} more participants` },
        { status: 400 }
      );
    }

    // Check if all human participants are ready
    const notReadyParticipants = battle.participants.filter(p => !p.isReady && !p.user.isBot);
    if (notReadyParticipants.length > 0) {
      return NextResponse.json(
        { error: `Waiting for ${notReadyParticipants.length} participant(s) to be ready` },
        { status: 400 }
      );
    }

    // Start the countdown - set status to COUNTDOWN and startedAt to now
    // All clients will poll and see this, showing synchronized countdown
    const updatedBattle = await prisma.battle.update({
      where: { id: battleId },
      data: {
        status: 'COUNTDOWN',
        startedAt: new Date(),
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        participants: {
          include: { user: { select: { id: true, name: true, email: true, isBot: true } } },
        },
        box: {
          include: {
            cards: {
              orderBy: { coinValue: 'desc' },
              take: 3,
              select: {
                id: true,
                name: true,
                imageUrlGatherer: true,
                imageUrlScryfall: true,
                coinValue: true,
              }
            }
          }
        },
      },
    });

    return NextResponse.json({
      success: true,
      battle: updatedBattle,
      countdownStartedAt: updatedBattle.startedAt,
      message: 'Countdown started!',
    });

  } catch (error) {
    console.error('Start countdown error:', error);
    return NextResponse.json(
      { error: 'Failed to start countdown' },
      { status: 500 }
    );
  }
}

