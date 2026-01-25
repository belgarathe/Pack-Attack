import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ACHIEVEMENTS, RARITY_CONFIG, CATEGORY_CONFIG } from '@/lib/achievements';

export async function GET() {
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

    // Ensure all achievements exist in database
    await ensureAchievementsExist();

    // Get all achievements from database
    const achievements = await prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
      ],
    });

    // Get user's achievement progress
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true },
    });

    // Create a map for quick lookup
    const userAchievementMap = new Map(
      userAchievements.map(ua => [ua.achievementId, ua])
    );

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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
  }
}

// Helper function to ensure all achievements exist in the database
async function ensureAchievementsExist() {
  for (const achievement of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      update: {
        name: achievement.name,
        description: achievement.description,
        category: achievement.category,
        icon: achievement.icon,
        rarity: achievement.rarity,
        requirement: achievement.requirement,
        coinReward: achievement.coinReward,
        isSecret: achievement.isSecret,
        sortOrder: achievement.sortOrder,
      },
      create: {
        code: achievement.code,
        name: achievement.name,
        description: achievement.description,
        category: achievement.category,
        icon: achievement.icon,
        rarity: achievement.rarity,
        requirement: achievement.requirement,
        coinReward: achievement.coinReward,
        isSecret: achievement.isSecret,
        sortOrder: achievement.sortOrder,
      },
    });
  }
}
