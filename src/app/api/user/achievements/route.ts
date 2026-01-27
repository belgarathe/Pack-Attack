import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ACHIEVEMENTS, RARITY_CONFIG, CATEGORY_CONFIG } from '@/lib/achievements';
import { achievementsCache, cacheKeys } from '@/lib/cache';

// PERFORMANCE: Cache flag to ensure achievements only sync once per server instance
let achievementsSynced = false;
let lastSyncTime = 0;
const SYNC_INTERVAL = 60 * 60 * 1000; // Only sync every hour
const ACHIEVEMENTS_CACHE_TTL = 30 * 1000; // 30 seconds
const PROGRESS_COOLDOWN = 30 * 1000; // 30 seconds
const lastProgressUpdate = new Map<string, number>();

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if we should also update progress (replaces separate /check endpoint)
    const { searchParams } = new URL(request.url);
    const updateProgress = searchParams.get('update') !== 'false';

    // PERFORMANCE: Fetch everything in parallel
    const [user, initialAchievements] = await Promise.all([
      prisma.user.findUnique({
        where: { email: session.user.email },
      }),
      prisma.achievement.findMany({
        where: { isActive: true },
        orderBy: [
          { category: 'asc' },
          { sortOrder: 'asc' },
        ],
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const cacheKey = cacheKeys.userAchievements(user.id);
    const cached = achievementsCache.get(cacheKey);

    if (!updateProgress && cached) {
      return NextResponse.json(cached);
    }

    const lastUpdatedAt = lastProgressUpdate.get(user.id) ?? 0;
    if (updateProgress && cached && Date.now() - lastUpdatedAt < PROGRESS_COOLDOWN) {
      return NextResponse.json(cached);
    }

    // PERFORMANCE: Sync achievements if needed
    const now = Date.now();
    const needsSync = !achievementsSynced || now - lastSyncTime > SYNC_INTERVAL;
    
    let achievements = initialAchievements;
    
    // If achievements are empty or never synced, we MUST sync first (blocking)
    if (achievements.length === 0 || !achievementsSynced) {
      await ensureAchievementsExist();
      achievementsSynced = true;
      lastSyncTime = Date.now();
      
      achievements = await prisma.achievement.findMany({
        where: { isActive: true },
        orderBy: [
          { category: 'asc' },
          { sortOrder: 'asc' },
        ],
      });
    } else if (needsSync) {
      // Background sync for subsequent requests
      ensureAchievementsExist().then(() => {
        achievementsSynced = true;
        lastSyncTime = Date.now();
      }).catch(console.error);
    }

    // Get user's achievement progress
    let userAchievements = await prisma.userAchievement.findMany({
      where: { userId: user.id },
    });

    // PERFORMANCE: If updateProgress is true, calculate and update progress inline
    // This replaces the separate /check endpoint call
    let newlyUnlocked: Array<{ code: string; name: string; coinReward: number }> = [];
    
    if (updateProgress && achievements.length > 0) {
      // Fetch stats in parallel - optimized queries
      const [totalPulls, totalBattles, battlesWon, totalSales, totalOrders, totalCoinsEarned, mythicPulls, rarePulls, jackpotWins] = await Promise.all([
        prisma.pull.count({ where: { userId: user.id } }),
        prisma.battleParticipant.count({ where: { userId: user.id } }),
        prisma.battle.count({ where: { winnerId: user.id } }),
        prisma.saleHistory.count({ where: { userId: user.id } }),
        prisma.order.count({ where: { userId: user.id } }),
        prisma.saleHistory.aggregate({ where: { userId: user.id }, _sum: { coinsReceived: true } }),
        prisma.pull.count({ where: { userId: user.id, card: { rarity: { in: ['mythic', 'Mythic', 'MYTHIC', 'legendary', 'Legendary', 'LEGENDARY'] } } } }),
        prisma.pull.count({ where: { userId: user.id, card: { rarity: { in: ['rare', 'Rare', 'RARE'] } } } }),
        prisma.battle.count({ where: { winnerId: user.id, battleMode: 'JACKPOT' } }),
      ]);

      // Build progress map
      const progressMap: Record<string, number> = {
        FIRST_PULL: totalPulls, PACK_ENTHUSIAST: totalPulls, PACK_ADDICT: totalPulls,
        PACK_MASTER: totalPulls, PACK_LEGEND: totalPulls, PACK_GOD: totalPulls,
        FIRST_BATTLE: totalBattles, FIRST_VICTORY: battlesWon, BATTLE_VETERAN: totalBattles,
        VICTORY_STREAK: battlesWon, BATTLE_CHAMPION: battlesWon, BATTLE_LEGEND: battlesWon,
        RARE_FINDER: rarePulls, MYTHIC_HUNTER: mythicPulls, LEGENDARY_COLLECTOR: mythicPulls,
        DIVERSE_COLLECTOR: 0, MASTER_COLLECTOR: totalPulls,
        FIRST_SALE: totalSales, MERCHANT: totalSales, TRADE_MASTER: totalSales,
        WEALTHY: Number(totalCoinsEarned._sum.coinsReceived || 0) + Number(user.coins),
        MILLIONAIRE: Number(totalCoinsEarned._sum.coinsReceived || 0) + Number(user.coins),
        FIRST_ORDER: totalOrders, LOYAL_CUSTOMER: totalOrders,
        JACKPOT_WINNER: jackpotWins,
      };

      // Time-based achievements
      const currentHour = new Date().getHours();
      if (currentHour >= 0 && currentHour < 4 && totalPulls > 0) progressMap.NIGHT_OWL = 1;
      if (currentHour >= 5 && currentHour < 7 && totalPulls > 0) progressMap.EARLY_BIRD = 1;

      // Process achievements - batch operations
      const userAchievementMap = new Map(userAchievements.map(ua => [ua.achievementId, ua]));
      const toCreate: Array<{ userId: string; achievementId: string; progress: number; unlockedAt: Date | null }> = [];
      const toUpdate: Array<{ id: string; progress: number; unlockedAt: Date | null }> = [];
      const updateTime = new Date();

      for (const achievement of achievements) {
        const progress = progressMap[achievement.code] || 0;
        const existingUA = userAchievementMap.get(achievement.id);
        const isUnlocked = progress >= achievement.requirement;

        if (!existingUA) {
          toCreate.push({
            userId: user.id,
            achievementId: achievement.id,
            progress: Math.min(progress, achievement.requirement),
            unlockedAt: isUnlocked ? updateTime : null,
          });
          if (isUnlocked) {
            newlyUnlocked.push({ code: achievement.code, name: achievement.name, coinReward: Number(achievement.coinReward) });
          }
        } else if (!existingUA.unlockedAt) {
          const newProgress = Math.min(progress, achievement.requirement);
          if (newProgress !== existingUA.progress || isUnlocked) {
            toUpdate.push({ id: existingUA.id, progress: newProgress, unlockedAt: isUnlocked ? updateTime : null });
            if (isUnlocked) {
              newlyUnlocked.push({ code: achievement.code, name: achievement.name, coinReward: Number(achievement.coinReward) });
            }
          }
        }
      }

      // Execute batch operations
      if (toCreate.length > 0 || toUpdate.length > 0) {
        await prisma.$transaction(async (tx) => {
          if (toCreate.length > 0) {
            await tx.userAchievement.createMany({ data: toCreate, skipDuplicates: true });
          }
          if (toUpdate.length > 0) {
            await Promise.all(toUpdate.map(ua => tx.userAchievement.update({ where: { id: ua.id }, data: { progress: ua.progress, unlockedAt: ua.unlockedAt } })));
          }
        });

        // Re-fetch user achievements after update
        userAchievements = await prisma.userAchievement.findMany({ where: { userId: user.id } });
      }
    }

    // Create lookup map
    const userAchievementMap = new Map(userAchievements.map(ua => [ua.achievementId, ua]));

    // Combine achievements with user progress
    const achievementsWithProgress = achievements.map(achievement => {
      const userAchievement = userAchievementMap.get(achievement.id);
      const isUnlocked = userAchievement?.unlockedAt !== null && userAchievement?.unlockedAt !== undefined;
      
      // Don't show secret achievements unless unlocked
      if (achievement.isSecret && !isUnlocked) {
        return {
          id: achievement.id,
          code: achievement.code,
          name: '???',
          description: 'This achievement is a secret!',
          category: achievement.category,
          icon: 'Lock',
          rarity: achievement.rarity,
          requirement: achievement.requirement,
          coinReward: Number(achievement.coinReward),
          isSecret: true,
          progress: 0,
          isUnlocked: false,
          unlockedAt: null,
          rewardClaimed: false,
        };
      }

      return {
        id: achievement.id,
        code: achievement.code,
        name: achievement.name,
        description: achievement.description,
        category: achievement.category,
        icon: achievement.icon,
        rarity: achievement.rarity,
        requirement: achievement.requirement,
        coinReward: Number(achievement.coinReward),
        isSecret: achievement.isSecret,
        progress: userAchievement?.progress || 0,
        isUnlocked,
        unlockedAt: userAchievement?.unlockedAt || null,
        rewardClaimed: userAchievement?.rewardClaimed || false,
      };
    });

    // Calculate summary stats
    const totalAchievements = achievements.length;
    const unlockedCount = achievementsWithProgress.filter(a => a.isUnlocked).length;
    const totalCoinRewards = achievementsWithProgress
      .filter(a => a.isUnlocked && !a.rewardClaimed)
      .reduce((sum, a) => sum + a.coinReward, 0);

    // Group by category for frontend display
    const byCategory = {
      PULLS: achievementsWithProgress.filter(a => a.category === 'PULLS'),
      BATTLES: achievementsWithProgress.filter(a => a.category === 'BATTLES'),
      COLLECTION: achievementsWithProgress.filter(a => a.category === 'COLLECTION'),
      ECONOMY: achievementsWithProgress.filter(a => a.category === 'ECONOMY'),
      SOCIAL: achievementsWithProgress.filter(a => a.category === 'SOCIAL'),
      SPECIAL: achievementsWithProgress.filter(a => a.category === 'SPECIAL'),
    };

    // Return response with newly unlocked achievements
    const payload = {
      achievements: achievementsWithProgress,
      byCategory,
      summary: {
        total: totalAchievements,
        unlocked: unlockedCount,
        progress: Math.round((unlockedCount / totalAchievements) * 100),
        unclaimedRewards: totalCoinRewards,
      },
      config: {
        rarity: RARITY_CONFIG,
        category: CATEGORY_CONFIG,
      },
      // Include newly unlocked achievements (if any)
      newlyUnlocked,
    };

    achievementsCache.set(cacheKey, payload, ACHIEVEMENTS_CACHE_TTL);
    if (updateProgress) {
      lastProgressUpdate.set(user.id, Date.now());
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
  }
}

// PERFORMANCE: Batch sync achievements instead of individual upserts
async function ensureAchievementsExist() {
  try {
    // Get existing achievement codes
    const existingAchievements = await prisma.achievement.findMany({
      select: { code: true },
    });
    const existingCodes = new Set(existingAchievements.map(a => a.code));

    // Find new achievements to create
    const newAchievements = ACHIEVEMENTS.filter(a => !existingCodes.has(a.code));

    // Batch create new achievements (if any)
    if (newAchievements.length > 0) {
      await prisma.achievement.createMany({
        data: newAchievements.map(a => ({
          code: a.code,
          name: a.name,
          description: a.description,
          category: a.category,
          icon: a.icon,
          rarity: a.rarity,
          requirement: a.requirement,
          coinReward: a.coinReward,
          isSecret: a.isSecret,
          sortOrder: a.sortOrder,
        })),
        skipDuplicates: true,
      });
    }

    // Only update existing achievements if definitions changed (rare)
    // This could be optimized further with a version hash
  } catch (error) {
    console.error('Error syncing achievements:', error);
  }
}
