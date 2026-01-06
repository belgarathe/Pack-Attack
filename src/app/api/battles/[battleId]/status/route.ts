import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get battle status for live updates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ battleId: string }> }
) {
  try {
    const session = await getCurrentSession();
    const { battleId } = await params;
    
    const isAdmin = session?.user?.role === 'ADMIN';

    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        creator: { select: { id: true, name: true, email: true } },
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
        participants: {
          include: { user: { select: { id: true, name: true, email: true, isBot: true } } },
        },
        winner: { select: { id: true, name: true, email: true } },
        pulls: {
          include: {
            participant: {
              include: { user: true },
            },
            pull: {
              include: { card: true },
            },
          },
          orderBy: [
            { roundNumber: 'asc' },
            { pulledAt: 'asc' },
          ],
        },
      },
    });

    if (!battle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }

    // Check if all participants are ready
    const allReady = battle.participants.length === battle.maxParticipants && 
                     battle.participants.every(p => p.isReady);

    // Serialize the battle data
    const serializedBattle = {
      ...battle,
      pulls: battle.pulls?.map(pull => ({
        ...pull,
        pull: pull.pull ? {
          ...pull.pull,
          cardValue: pull.pull.cardValue ? Number(pull.pull.cardValue) : null,
          card: pull.pull.card ? {
            ...pull.pull.card,
            pullRate: Number(pull.pull.card.pullRate),
          } : null,
        } : null,
      })),
      // Filter out bot info for non-admins
      participants: battle.participants.map(p => ({
        ...p,
        user: {
          ...p.user,
          isBot: isAdmin ? p.user.isBot : false,
        },
      })),
    };

    // Calculate countdown remaining if in COUNTDOWN status
    let countdownRemaining = null;
    if (battle.status === 'COUNTDOWN' && battle.startedAt) {
      const elapsedMs = Date.now() - new Date(battle.startedAt).getTime();
      const countdownSeconds = 3; // 3 second countdown
      countdownRemaining = Math.max(0, countdownSeconds - (elapsedMs / 1000));
    }

    return NextResponse.json({ 
      success: true, 
      battle: serializedBattle,
      allReady,
      isFull: battle.participants.length >= battle.maxParticipants,
      isCountingDown: battle.status === 'COUNTDOWN',
      countdownStartedAt: battle.startedAt?.toISOString() || null,
      countdownRemaining,
    });
  } catch (error) {
    console.error('Error getting battle status:', error);
    return NextResponse.json({ error: 'Failed to get battle status' }, { status: 500 });
  }
}

