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
    // Initially create pulls WITHOUT assigning to user's collection (userId will be set later based on winner)
    const allPullIds: string[] = [];
    const participantTotals = new Map<string, number>();
    const participantPullIds = new Map<string, string[]>(); // Track which pulls belong to which participant for display

    for (const participant of battle.participants) {
      let participantTotal = 0;
      const thisPullIds: string[] = [];

      // Pull cards for each round
      for (let round = 1; round <= battle.rounds; round++) {
        const cardsPerRound = battle.box.cardsPerPack;
        
        for (let cardIndex = 0; cardIndex < cardsPerRound; cardIndex++) {
          const card = await getRandomCard(battle.box.id);
          
          // Create pull record - initially assigned to the participant who pulled it
          // This will be reassigned after winner is determined
          const pull = await prisma.pull.create({
            data: {
              userId: participant.userId,
              boxId: battle.box.id,
              cardId: card.id,
              cardValue: new Decimal(card.coinValue),
            },
          });

          // Create battle pull record (for display/animation purposes)
          await prisma.battlePull.create({
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
          });

          allPullIds.push(pull.id);
          thisPullIds.push(pull.id);
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
      participantPullIds.set(participant.userId, thisPullIds);
    }

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

    // Now distribute cards based on battle mode
    if (battle.shareMode) {
      // SHARE MODE: Randomly distribute ALL cards among ALL participants
      const shuffledPullIds = shuffleArray(allPullIds);
      const participantUserIds = battle.participants.map(p => p.userId);
      
      // Distribute cards round-robin style after shuffle
      for (let i = 0; i < shuffledPullIds.length; i++) {
        const recipientUserId = participantUserIds[i % participantUserIds.length];
        await prisma.pull.update({
          where: { id: shuffledPullIds[i] },
          data: { userId: recipientUserId },
        });
      }
      
      console.log(`Share mode: ${shuffledPullIds.length} cards randomly distributed among ${participantUserIds.length} participants`);
    } else {
      // WINNER TAKES ALL: Transfer ALL pulls to the winner
      // Delete pulls from losers' collections and assign to winner
      if (winnerId) {
        await prisma.pull.updateMany({
          where: { id: { in: allPullIds } },
          data: { userId: winnerId },
        });
        
        console.log(`${battle.battleMode} mode: ${allPullIds.length} cards transferred to winner ${winnerId}`);
      }
    }

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


