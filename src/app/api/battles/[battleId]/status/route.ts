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

    // Serialize the battle data - convert all Decimal values to numbers
    const serializedBattle = {
      ...battle,
      entryFee: Number(battle.entryFee),
      totalPrize: Number(battle.totalPrize),
      box: battle.box ? {
        ...battle.box,
        price: Number(battle.box.price),
        cards: battle.box.cards?.map(card => ({
          ...card,
          coinValue: Number(card.coinValue),
        })),
      } : null,
      pulls: battle.pulls?.map(pull => ({
        ...pull,
        coinValue: Number(pull.coinValue), // BattlePull.coinValue
        pull: pull.pull ? {
          ...pull.pull,
          cardValue: pull.pull.cardValue ? Number(pull.pull.cardValue) : null,
          card: pull.pull.card ? {
            ...pull.pull.card,
            pullRate: Number(pull.pull.card.pullRate),
            coinValue: Number(pull.pull.card.coinValue),
          } : null,
        } : null,
      })),
      // Filter out bot info for non-admins
      participants: battle.participants.map(p => ({
        ...p,
        totalValue: Number(p.totalValue),
        user: {
          ...p.user,
          isBot: isAdmin ? p.user.isBot : false,
        },
      })),
    };

    return NextResponse.json({ 
      success: true, 
      battle: serializedBattle,
      allReady,
      isFull: battle.participants.length >= battle.maxParticipants,
    });
  } catch (error) {
    console.error('Error getting battle status:', error);
    return NextResponse.json({ error: 'Failed to get battle status' }, { status: 500 });
  }
}

