import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emitCoinBalanceUpdate } from '@/lib/coin-events';

const CHECK_COOLDOWN = 30 * 1000; // 30 seconds
const lastCheckByUser = new Map<string, number>();

// POST: Check and update achievement progress for the current user
export async function POST() {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // PERFORMANCE: Fetch user and achievements in parallel
    const [user, achievements] = await Promise.all([
      prisma.user.findUnique({
        where: { email: session.user.email },
      }),
      prisma.achievement.findMany({
        where: { isActive: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const lastCheck = lastCheckByUser.get(user.id) ?? 0;
    if (Date.now() - lastCheck < CHECK_COOLDOWN) {
      return NextResponse.json({ success: true, skipped: true });
    }

    // PERFORMANCE: Optimized stats queries - combined where possible
    const [
      totalPulls,
      totalBattles,
      battlesWon,
      totalSales,
      totalOrders,
      totalCoinsEarned,
      uniqueGamesData,
      mythicPulls,
      rarePulls,
      jackpotWins,
    ] = await Promise.all([
      prisma.pull.count({ where: { userId: user.id } }),
      prisma.battleParticipant.count({ where: { userId: user.id } }),
      prisma.battle.count({ where: { winnerId: user.id } }),
      prisma.saleHistory.count({ where: { userId: user.id } }),
      prisma.order.count({ where: { userId: user.id } }),
      prisma.saleHistory.aggregate({
        where: { userId: user.id },
        _sum: { coinsReceived: true },
      }),
      // PERFORMANCE: Use groupBy instead of findMany + Set for unique games
      prisma.pull.groupBy({
        by: ['cardId'],
        where: { userId: user.id, card: { isNot: null } },
        _count: true,
      }).then(async groups => {
        if (groups.length === 0) return 0;
        const cardIds = groups.map(g => g.cardId).filter(Boolean) as string[];
        if (cardIds.length === 0) return 0;
        const games = await prisma.card.groupBy({
          by: ['sourceGame'],
          where: { id: { in: cardIds } },
        });
        return games.length;
      }),
      prisma.pull.count({
        where: {
          userId: user.id,
          card: { rarity: { in: ['mythic', 'Mythic', 'MYTHIC', 'legendary', 'Legendary', 'LEGENDARY'] } },
        },
      }),
      prisma.pull.count({
        where: {
          userId: user.id,
          card: { rarity: { in: ['rare', 'Rare', 'RARE'] } },
        },
      }),
      prisma.battle.count({
        where: { winnerId: user.id, battleMode: 'JACKPOT' },
      }),
    ]);

    const uniqueGames = uniqueGamesData;
    const collectionSize = totalPulls; // Same as totalPulls with cardId filter

    // Map achievement codes to their progress
    const progressMap: Record<string, number> = {
      // Pulls achievements
      FIRST_PULL: totalPulls,
      PACK_ENTHUSIAST: totalPulls,
      PACK_ADDICT: totalPulls,
      PACK_MASTER: totalPulls,
      PACK_LEGEND: totalPulls,
      PACK_GOD: totalPulls,
      
      // Battle achievements
      FIRST_BATTLE: totalBattles,
      FIRST_VICTORY: battlesWon,
      BATTLE_VETERAN: totalBattles,
      VICTORY_STREAK: battlesWon,
      BATTLE_CHAMPION: battlesWon,
      BATTLE_LEGEND: battlesWon,
      
      // Collection achievements
      RARE_FINDER: rarePulls,
      MYTHIC_HUNTER: mythicPulls,
      LEGENDARY_COLLECTOR: mythicPulls,
      DIVERSE_COLLECTOR: uniqueGames,
      MASTER_COLLECTOR: collectionSize,
      
      // Economy achievements
      FIRST_SALE: totalSales,
      MERCHANT: totalSales,
      TRADE_MASTER: totalSales,
      WEALTHY: Number(totalCoinsEarned._sum.coinsReceived || 0) + Number(user.coins),
      MILLIONAIRE: Number(totalCoinsEarned._sum.coinsReceived || 0) + Number(user.coins),
      
      // Social achievements
      FIRST_ORDER: totalOrders,
      LOYAL_CUSTOMER: totalOrders,
      
      // Special achievements
      JACKPOT_WINNER: jackpotWins,
    };

    // Check time-based achievements
    const currentHour = new Date().getHours();
    if (currentHour >= 0 && currentHour < 4 && totalPulls > 0) {
      progressMap.NIGHT_OWL = 1;
    }
    if (currentHour >= 5 && currentHour < 7 && totalPulls > 0) {
      progressMap.EARLY_BIRD = 1;
    }

    // PERFORMANCE: Batch fetch all existing user achievements instead of individual queries
    const existingUserAchievements = await prisma.userAchievement.findMany({
      where: { userId: user.id },
    });

    // Create lookup map for O(1) access
    const userAchievementMap = new Map(
      existingUserAchievements.map(ua => [ua.achievementId, ua])
    );

    // Prepare batch operations
    const toCreate: Array<{
      userId: string;
      achievementId: string;
      progress: number;
      unlockedAt: Date | null;
    }> = [];
    const toUpdate: Array<{
      id: string;
      progress: number;
      unlockedAt: Date | null;
    }> = [];
    const newlyUnlocked: Array<{ code: string; name: string; coinReward: number }> = [];

    const now = new Date();

    // Process all achievements in memory
    for (const achievement of achievements) {
      const progress = progressMap[achievement.code] || 0;
      const existingUA = userAchievementMap.get(achievement.id);
      const isUnlocked = progress >= achievement.requirement;

      if (!existingUA) {
        // Need to create
        toCreate.push({
          userId: user.id,
          achievementId: achievement.id,
          progress: Math.min(progress, achievement.requirement),
          unlockedAt: isUnlocked ? now : null,
        });

        if (isUnlocked) {
          newlyUnlocked.push({
            code: achievement.code,
            name: achievement.name,
            coinReward: Number(achievement.coinReward),
          });
        }
      } else if (!existingUA.unlockedAt) {
        // Need to update if progress changed
        const newProgress = Math.min(progress, achievement.requirement);
        if (newProgress !== existingUA.progress || isUnlocked) {
          toUpdate.push({
            id: existingUA.id,
            progress: newProgress,
            unlockedAt: isUnlocked ? now : null,
          });

          if (isUnlocked) {
            newlyUnlocked.push({
              code: achievement.code,
              name: achievement.name,
              coinReward: Number(achievement.coinReward),
            });
          }
        }
      }
    }

    // PERFORMANCE: Execute batch operations
    await prisma.$transaction(async (tx) => {
      // Batch create new user achievements
      if (toCreate.length > 0) {
        await tx.userAchievement.createMany({
          data: toCreate,
          skipDuplicates: true,
        });
      }

      // Batch update existing achievements (need individual updates for different values)
      // But we can run them in parallel within the transaction
      if (toUpdate.length > 0) {
        await Promise.all(
          toUpdate.map(ua =>
            tx.userAchievement.update({
              where: { id: ua.id },
              data: {
                progress: ua.progress,
                unlockedAt: ua.unlockedAt,
              },
            })
          )
        );
      }
    });

    lastCheckByUser.set(user.id, Date.now());

    return NextResponse.json({
      success: true,
      newlyUnlocked,
      totalNewRewards: newlyUnlocked.reduce((sum, a) => sum + a.coinReward, 0),
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    return NextResponse.json({ error: 'Failed to check achievements' }, { status: 500 });
  }
}
