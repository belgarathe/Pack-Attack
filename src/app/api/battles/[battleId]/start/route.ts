import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma, withRetry } from '@/lib/prisma';

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

// Fisher-Yates shuffle algorithm for random distribution
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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

    // Get the battle with all details - with retry for connection resilience
    const battle = await withRetry(
      () => prisma.battle.findUnique({
        where: { id: battleId },
        include: {
          participants: {
            include: { user: true },
          },
          box: {
            include: { cards: true },
          },
        },
      }),
      'battle-start:findBattle'
    );

    if (!battle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }

    // Check if user is the battle creator or an admin - with retry
    const user = await withRetry(
      () => prisma.user.findUnique({
        where: { email: session.user.email },
      }),
      'battle-start:findUser'
    );

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

    // PERFORMANCE: Prepare all pulls data upfront without DB calls in loops
    // Pre-calculate all card draws and batch all database operations
    
    const allPullIds: string[] = [];
    const participantTotals = new Map<string, number>();
    const participantPullIds = new Map<string, string[]>();

    // Pre-fetch all cards for random selection (single query)
    const boxCards = battle.box.cards;
    if (boxCards.length === 0) {
      return NextResponse.json({ error: 'No cards in box' }, { status: 400 });
    }

    const totalPullRate = boxCards.reduce((sum, card) => sum + Number(card.pullRate), 0);

    // Helper to draw a random card (no DB call)
    const drawRandomCard = () => {
      const random = Math.random() * totalPullRate;
      let accumulator = 0;
      for (const card of boxCards) {
        accumulator += Number(card.pullRate);
        if (random <= accumulator) return card;
      }
      return boxCards[boxCards.length - 1];
    };

    // Prepare all pull data in memory
    interface PullData {
      participantId: string;
      participantUserId: string;
      cardId: string;
      cardValue: number;
      cardName: string;
      cardImage: string | null;
      cardRarity: string | null;
      round: number;
    }
    const allPullsData: PullData[] = [];

    for (const participant of battle.participants) {
      let participantTotal = 0;

      for (let round = 1; round <= battle.rounds; round++) {
        for (let cardIndex = 0; cardIndex < battle.box.cardsPerPack; cardIndex++) {
          const card = drawRandomCard();
          const cardCoinValue = Number(card.coinValue);
          
          allPullsData.push({
            participantId: participant.id,
            participantUserId: participant.userId,
            cardId: card.id,
            cardValue: cardCoinValue,
            cardName: card.name,
            cardImage: card.imageUrlGatherer,
            cardRarity: card.rarity,
            round,
          });
          
          participantTotal += cardCoinValue;
        }
      }

      participantTotals.set(participant.id, participantTotal);
    }

    // PERFORMANCE: Execute all database operations in a single transaction
    await prisma.$transaction(async (tx) => {
      // Batch create all pulls
      for (const pullData of allPullsData) {
        const pull = await tx.pull.create({
          data: {
            userId: pullData.participantUserId,
            boxId: battle.box.id,
            cardId: pullData.cardId,
            cardValue: pullData.cardValue,
          },
        });

        await tx.battlePull.create({
          data: {
            battleId: battleId!,
            participantId: pullData.participantId,
            pullId: pull.id,
            roundNumber: pullData.round,
            coinValue: pullData.cardValue,
            itemName: pullData.cardName,
            itemImage: pullData.cardImage,
            itemRarity: pullData.cardRarity,
          },
        });

        allPullIds.push(pull.id);
        
        const existing = participantPullIds.get(pullData.participantUserId) || [];
        existing.push(pull.id);
        participantPullIds.set(pullData.participantUserId, existing);
      }

      // Batch update all participant totals
      for (const participant of battle.participants) {
        await tx.battleParticipant.update({
          where: { id: participant.id },
          data: {
            totalValue: participantTotals.get(participant.id) || 0,
            roundsPulled: battle.rounds,
          },
        });
      }
    });

    // Determine winner based on battle mode
    let winnerId: string | null = null;
    
    if (battle.shareMode) {
      // SHARE MODE: No single winner - cards will be randomly distributed
      // Pick a random "winner" just for display purposes
      const randomIndex = Math.floor(Math.random() * battle.participants.length);
      winnerId = battle.participants[randomIndex].userId;
    } else if (battle.battleMode === 'UPSIDE_DOWN') {
      // LOWEST WINS: Player with lowest total value wins ALL cards
      let minValue = Infinity;
      for (const [participantId, value] of participantTotals) {
        if (value < minValue) {
          minValue = value;
          const participant = battle.participants.find(p => p.id === participantId);
          winnerId = participant?.userId || null;
        }
      }
    } else if (battle.battleMode === 'JACKPOT') {
      // JACKPOT: Completely random winner (not weighted) wins ALL cards
      const randomIndex = Math.floor(Math.random() * battle.participants.length);
      winnerId = battle.participants[randomIndex].userId;
    } else {
      // NORMAL (HIGHEST WINS): Player with highest total value wins ALL cards
      let maxValue = 0;
      for (const [participantId, value] of participantTotals) {
        if (value > maxValue) {
          maxValue = value;
          const participant = battle.participants.find(p => p.id === participantId);
          winnerId = participant?.userId || null;
        }
      }
    }

    // PERFORMANCE: Distribute cards inside a transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      if (battle.shareMode) {
        // SHARE MODE: Randomly distribute ALL cards among ALL participants
        const shuffledPullIds = shuffleArray(allPullIds);
        const participantUserIds = battle.participants.map(p => p.userId);
        
        // PERFORMANCE: Group updates by user to minimize queries
        const userPullMap = new Map<string, string[]>();
        for (let i = 0; i < shuffledPullIds.length; i++) {
          const recipientUserId = participantUserIds[i % participantUserIds.length];
          const existing = userPullMap.get(recipientUserId) || [];
          existing.push(shuffledPullIds[i]);
          userPullMap.set(recipientUserId, existing);
        }
        
        // Batch update pulls for each user
        for (const [userId, pullIds] of userPullMap) {
          await tx.pull.updateMany({
            where: { id: { in: pullIds } },
            data: { userId },
          });
        }
        
        console.log(`Share mode: ${shuffledPullIds.length} cards randomly distributed among ${participantUserIds.length} participants`);
      } else {
        // WINNER TAKES ALL: Transfer ALL pulls to the winner
        if (winnerId) {
          await tx.pull.updateMany({
            where: { id: { in: allPullIds } },
            data: { userId: winnerId },
          });
          
          console.log(`${battle.battleMode} mode: ${allPullIds.length} cards transferred to winner ${winnerId}`);
        }
      }
    });

    // Calculate total prize (entry fees)
    const totalPrize = battle.entryFee * battle.participants.length;

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

    // Award entry fee prize to winner (if not share mode)
    if (!battle.shareMode && winnerId && totalPrize > 0) {
      await prisma.user.update({
        where: { id: winnerId },
        data: {
          coins: { increment: totalPrize },
        },
      });
    }

    // Serialize battle data - convert all Decimal values to numbers
    const serializedBattle = {
      ...updatedBattle,
      entryFee: Number(updatedBattle.entryFee),
      totalPrize: Number(updatedBattle.totalPrize),
      box: updatedBattle.box ? {
        ...updatedBattle.box,
        price: Number(updatedBattle.box.price),
      } : null,
      pulls: updatedBattle.pulls?.map(pull => ({
        ...pull,
        coinValue: Number(pull.coinValue),
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
      participants: updatedBattle.participants.map(p => ({
        ...p,
        totalValue: Number(p.totalValue),
      })),
    };

    return NextResponse.json({
      success: true,
      battle: serializedBattle,
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


