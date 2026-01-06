import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

async function getRandomCard(boxId: string) {
  // Get all cards for this box
  const cards = await prisma.card.findMany({
    where: { boxId },
  });

  if (cards.length === 0) {
    throw new Error('No cards found for this box');
  }

  // Calculate total pull rate
  const totalPullRate = cards.reduce((sum, card) => {
    return sum + Number(card.pullRate);
  }, 0);

  // Generate random number
  const random = Math.random() * totalPullRate;

  // Select card based on pull rates
  let accumulator = 0;
  for (const card of cards) {
    accumulator += Number(card.pullRate);
    if (random <= accumulator) {
      return card;
    }
  }

  // Fallback to last card
  return cards[cards.length - 1];
}

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

    // Get the battle with all details
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        participants: {
          include: { user: true },
        },
        box: {
          include: { cards: true },
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
      return NextResponse.json({ error: 'Only the battle creator or admin can start the battle' }, { status: 403 });
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

    // Check if all participants are ready
    const notReadyParticipants = battle.participants.filter(p => !p.isReady && !p.user.isBot);
    if (notReadyParticipants.length > 0) {
      return NextResponse.json(
        { error: `Waiting for ${notReadyParticipants.length} participant(s) to be ready` },
        { status: 400 }
      );
    }

    // Auto-mark bots as ready if they aren't already
    const botsToReady = battle.participants.filter(p => p.user.isBot && !p.isReady);
    if (botsToReady.length > 0) {
      await prisma.battleParticipant.updateMany({
        where: {
          id: { in: botsToReady.map(p => p.id) },
        },
        data: { isReady: true },
      });
    }

    // Start the battle
    await prisma.battle.update({
      where: { id: battleId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    // Process pulls for each participant
    const battlePulls = [];
    const participantTotals = new Map<string, number>();

    for (const participant of battle.participants) {
      let participantTotal = 0;

      // Pull cards for each round
      for (let round = 1; round <= battle.rounds; round++) {
        // Pull cards per pack (usually multiple cards per round)
        const cardsPerRound = battle.box.cardsPerPack;
        
        for (let cardIndex = 0; cardIndex < cardsPerRound; cardIndex++) {
          const card = await getRandomCard(battle.box.id);
          
          // Create pull record
          const pull = await prisma.pull.create({
            data: {
              userId: participant.userId,
              boxId: battle.box.id,
              cardId: card.id,
              cardValue: new Decimal(card.coinValue),
            },
          });

          // Create battle pull record
          const battlePull = await prisma.battlePull.create({
            data: {
              battleId,
              participantId: participant.id,
              pullId: pull.id,
              roundNumber: round,
              coinValue: card.coinValue,
              itemName: card.name,
              itemImage: card.imageUrlGatherer,
              itemRarity: card.rarity,
            },
            include: {
              pull: {
                include: { card: true },
              },
            },
          });

          battlePulls.push(battlePull);
          participantTotal += card.coinValue;
        }
      }

      // Update participant total value
      await prisma.battleParticipant.update({
        where: { id: participant.id },
        data: {
          totalValue: participantTotal,
          roundsPulled: battle.rounds,
        },
      });

      participantTotals.set(participant.id, participantTotal);
    }

    // Determine winner (highest total value)
    let winnerId: string | null = null;
    let maxValue = 0;
    
    // Handle different battle modes
    if (battle.battleMode === 'UPSIDE_DOWN') {
      // Lowest value wins
      let minValue = Infinity;
      for (const [participantId, value] of participantTotals) {
        if (value < minValue) {
          minValue = value;
          const participant = battle.participants.find(p => p.id === participantId);
          winnerId = participant?.userId || null;
        }
      }
    } else if (battle.battleMode === 'JACKPOT') {
      // Weighted random selection based on total values
      const totalPool = Array.from(participantTotals.values()).reduce((sum, val) => sum + val, 0);
      const random = Math.random() * totalPool;
      let accumulator = 0;
      
      for (const [participantId, value] of participantTotals) {
        accumulator += value;
        if (random <= accumulator) {
          const participant = battle.participants.find(p => p.id === participantId);
          winnerId = participant?.userId || null;
          break;
        }
      }
    } else {
      // Normal mode - highest value wins
      for (const [participantId, value] of participantTotals) {
        if (value > maxValue) {
          maxValue = value;
          const participant = battle.participants.find(p => p.id === participantId);
          winnerId = participant?.userId || null;
        }
      }
    }

    // Calculate total prize (if share mode is false, winner gets all)
    const totalPrize = battle.shareMode 
      ? 0 // In share mode, cards are distributed to all players
      : battle.entryFee * battle.participants.length; // Winner takes all entry fees

    // Update battle with winner and finish status
    const updatedBattle = await prisma.battle.update({
      where: { id: battleId },
      data: {
        status: 'FINISHED',
        winnerId,
        totalPrize,
        finishedAt: new Date(),
      },
      include: {
        participants: {
          include: { 
            user: { 
              select: { id: true, name: true, email: true, isBot: true } 
            } 
          },
        },
        winner: { 
          select: { id: true, name: true, email: true } 
        },
        box: true,
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

    // If not share mode, award prize to winner
    if (!battle.shareMode && winnerId && totalPrize > 0) {
      await prisma.user.update({
        where: { id: winnerId },
        data: {
          coins: { increment: totalPrize },
        },
      });
    }

    // If share mode, distribute cards to all participants
    if (battle.shareMode) {
      // This would require additional logic to fairly distribute the pulled cards
      // For now, each participant keeps their own pulls
      console.log('Share mode: Cards already assigned to participants');
    }

    return NextResponse.json({
      success: true,
      battle: updatedBattle,
      message: 'Battle completed successfully!',
    });

  } catch (error) {
    console.error('Start battle error:', error);
    return NextResponse.json(
      { error: 'Failed to start battle' },
      { status: 500 }
    );
  }
}


