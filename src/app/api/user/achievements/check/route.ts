import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emitCoinBalanceUpdate } from '@/lib/coin-events';

// POST: Check and update achievement progress for the current user
export async function POST() {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all active achievements
    const achievements = await prisma.achievement.findMany({
      where: { isActive: true },
    });

    // Get current user stats for checking achievements
    const [
      totalPulls,
      totalBattles,
      battlesWon,
      totalSales,
      totalOrders,
      totalCoinsEarned,
      uniqueGames,
      mythicPulls,
      rarePulls,
      jackpotWins,
      collectionSize,
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
      prisma.pull.findMany({
        where: { userId: user.id, card: { isNot: null } },
        include: { card: { select: { sourceGame: true } } },
      }).then(pulls => new Set(pulls.map(p => p.card?.sourceGame)).size),
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
      prisma.pull.count({
        where: { userId: user.id, cardId: { not: null } },
      }),
    ]);

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

    // Update progress for each achievement
    const newlyUnlocked: Array<{ code: string; name: string; coinReward: number }> = [];

    for (const achievement of achievements) {
      const progress = progressMap[achievement.code] || 0;
      
      // Get or create user achievement
      let userAchievement = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId: user.id,
            achievementId: achievement.id,
          },
        },
      });

      if (!userAchievement) {
        userAchievement = await prisma.userAchievement.create({
          data: {
            userId: user.id,
            achievementId: achievement.id,
            progress: Math.min(progress, achievement.requirement),
            unlockedAt: progress >= achievement.requirement ? new Date() : null,
          },
        });
        
        if (progress >= achievement.requirement) {
          newlyUnlocked.push({
            code: achievement.code,
            name: achievement.name,
            coinReward: Number(achievement.coinReward),
          });
        }
      } else if (!userAchievement.unlockedAt) {
        // Update progress if not yet unlocked
        const wasUnlocked = progress >= achievement.requirement;
        
        await prisma.userAchievement.update({
          where: { id: userAchievement.id },
          data: {
            progress: Math.min(progress, achievement.requirement),
            unlockedAt: wasUnlocked ? new Date() : null,
          },
        });

        if (wasUnlocked) {
          newlyUnlocked.push({
            code: achievement.code,
            name: achievement.name,
            coinReward: Number(achievement.coinReward),
          });
        }
      }
    }

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
