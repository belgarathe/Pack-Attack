import { NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/prisma';
import { awardXp } from '@/lib/level';

// This endpoint checks for battles that have been full for 30 minutes
// and automatically starts them if all players haven't pressed start
export async function POST(request: Request) {
  try {
    // Verify this is an authorized call (you can add API key auth here)
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.CRON_SECRET || 'your-secret-key';
    
    if (authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find battles that are:
    // 1. Still in WAITING status
    // 2. Have been full for at least 30 minutes (OR created 30+ mins ago if fullAt not set)
    // 3. Have all participants joined
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Get ALL waiting battles and filter by full status
    const allWaitingBattles = await withRetry(
      () => prisma.battle.findMany({
        where: {
          status: 'WAITING',
        },
        include: {
          participants: {
            include: { user: true },
          },
          box: {
            include: { cards: true },
          },
        },
      }),
      'auto-start:findBattles'
    );

    // Filter to only FULL battles that have been waiting 30+ minutes
    const battlesToStart = allWaitingBattles.filter(battle => {
      // Must be full
      if (battle.participants.length < battle.maxParticipants) {
        return false;
      }
      
      // Check if 30 minutes have passed since fullAt OR createdAt (fallback)
      const timeToCheck = battle.fullAt || battle.createdAt;
      return timeToCheck <= thirtyMinutesAgo;
    });

    console.log(`[AUTO-START] Found ${battlesToStart.length} battles to auto-start`);

    const results = [];

    for (const battle of battlesToStart) {
      try {
        // Verify battle is full
        if (battle.participants.length < battle.maxParticipants) {
          console.log(`[AUTO-START] Battle ${battle.id} is not full, skipping`);
          continue;
        }

        // Auto-mark all participants as ready (including non-bots)
        await prisma.battleParticipant.updateMany({
          where: {
            battleId: battle.id,
            isReady: false,
          },
          data: { isReady: true },
        });

        // Now start the battle using the same logic as the manual start
        await startBattle(battle);

        results.push({
          battleId: battle.id,
          status: 'started',
          message: 'Battle auto-started after 30 minutes',
        });

        console.log(`[AUTO-START] Successfully started battle ${battle.id}`);
      } catch (error) {
        console.error(`[AUTO-START] Failed to start battle ${battle.id}:`, error);
        results.push({
          battleId: battle.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: battlesToStart.length,
      results,
    });
  } catch (error) {
    console.error('[AUTO-START] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process auto-start' },
      { status: 500 }
    );
  }
}

// Helper function to start a battle (extracted from start route logic)
async function startBattle(battle: any) {
  // Start the battle
  await prisma.battle.update({
    where: { id: battle.id },
    data: {
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
  });

  // Pre-fetch all cards for random selection
  const boxCards = battle.box.cards;
  if (boxCards.length === 0) {
    throw new Error('No cards in box');
  }

  const totalPullRate = boxCards.reduce((sum: number, card: any) => sum + Number(card.pullRate), 0);

  // Helper to draw a random card
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
  const allPullIds: string[] = [];
  const participantTotals = new Map<string, number>();

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

  // Execute all database operations in a single transaction
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
          battleId: battle.id,
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
  let isDraw = false;
  
  if (battle.shareMode) {
    const randomIndex = Math.floor(Math.random() * battle.participants.length);
    winnerId = battle.participants[randomIndex].userId;
  } else if (battle.battleMode === 'JACKPOT') {
    const randomIndex = Math.floor(Math.random() * battle.participants.length);
    winnerId = battle.participants[randomIndex].userId;
  } else {
    const values = Array.from(participantTotals.entries());
    const isUpsideDown = battle.battleMode === 'UPSIDE_DOWN';
    
    const targetValue = isUpsideDown
      ? Math.min(...values.map(([, v]) => v))
      : Math.max(...values.map(([, v]) => v));
    
    const tiedParticipants = values.filter(([, v]) => v === targetValue);
    
    if (tiedParticipants.length > 1) {
      // Tiebreaker: count individual round wins for each tied participant
      const tiedIds = new Set(tiedParticipants.map(([id]) => id));
      const roundWins = new Map<string, number>();
      for (const id of tiedIds) roundWins.set(id, 0);

      for (let r = 1; r <= battle.rounds; r++) {
        const roundPulls = allPullsData.filter(p => p.round === r);
        const roundTotals = new Map<string, number>();
        for (const pull of roundPulls) {
          roundTotals.set(pull.participantId, (roundTotals.get(pull.participantId) || 0) + pull.cardValue);
        }
        let bestRoundVal = isUpsideDown ? Infinity : -Infinity;
        for (const [pid, val] of roundTotals) {
          if (!tiedIds.has(pid)) continue;
          if (isUpsideDown ? val < bestRoundVal : val > bestRoundVal) bestRoundVal = val;
        }
        for (const [pid, val] of roundTotals) {
          if (tiedIds.has(pid) && val === bestRoundVal) {
            roundWins.set(pid, (roundWins.get(pid) || 0) + 1);
          }
        }
      }

      const maxRoundWins = Math.max(...roundWins.values());
      const roundWinners = Array.from(roundWins.entries()).filter(([, w]) => w === maxRoundWins);

      if (roundWinners.length === 1) {
        const participant = battle.participants.find((p: any) => p.id === roundWinners[0][0]);
        winnerId = participant?.userId || null;
        console.log(`[AUTO-START] Tiebreaker resolved by round wins (${maxRoundWins} rounds won)`);
      } else {
        isDraw = true;
        winnerId = null;
        console.log(`[AUTO-START] True draw: ${roundWinners.length} participants tied on value AND round wins`);
      }
    } else {
      const [winnerParticipantId] = tiedParticipants[0];
      const participant = battle.participants.find((p: any) => p.id === winnerParticipantId);
      winnerId = participant?.userId || null;
    }
  }

  // Distribute cards
  await prisma.$transaction(async (tx) => {
    if (battle.shareMode) {
      const shuffledPullIds = shuffleArray(allPullIds);
      const participantUserIds = battle.participants.map((p: any) => p.userId);
      
      const userPullMap = new Map<string, string[]>();
      for (let i = 0; i < shuffledPullIds.length; i++) {
        const recipientUserId = participantUserIds[i % participantUserIds.length];
        const existing = userPullMap.get(recipientUserId) || [];
        existing.push(shuffledPullIds[i]);
        userPullMap.set(recipientUserId, existing);
      }
      
      for (const [userId, pullIds] of userPullMap) {
        await tx.pull.updateMany({
          where: { id: { in: pullIds } },
          data: { userId },
        });
      }
    } else if (isDraw) {
      // DRAW: each player keeps the cards they drew
      console.log(`[AUTO-START] DRAW: All ${battle.participants.length} participants keep their own cards`);
    } else {
      if (winnerId) {
        await tx.pull.updateMany({
          where: { id: { in: allPullIds } },
          data: { userId: winnerId },
        });
      }
    }
  });

  // Calculate total prize
  const totalPrize = battle.entryFee * battle.participants.length;

  // Update battle with winner and finish status
  await prisma.battle.update({
    where: { id: battle.id },
    data: {
      status: 'FINISHED',
      isDraw,
      winnerId,
      totalPrize: isDraw ? 0 : totalPrize,
      finishedAt: new Date(),
    },
  });

  // Award entry fee prize to winner (not on draw)
  if (!battle.shareMode && !isDraw && winnerId && totalPrize > 0) {
    await prisma.user.update({
      where: { id: winnerId },
      data: {
        coins: { increment: totalPrize },
      },
    });
  }

  // Award XP: 150 XP for all participants, +250 bonus for winner (non-draw, non-share)
  for (const participant of battle.participants) {
    await awardXp(participant.userId, 150, prisma);
  }
  if (!battle.shareMode && !isDraw && winnerId) {
    await awardXp(winnerId, 250, prisma);
  }

  console.log(`[AUTO-START] Battle ${battle.id} completed. ${isDraw ? 'DRAW' : `Winner: ${winnerId}`}`);
}

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
