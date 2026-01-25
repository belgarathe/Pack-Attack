import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emitCoinBalanceUpdate } from '@/lib/coin-events';

// POST: Claim reward for an unlocked achievement
export async function POST(request: Request) {
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

    const { achievementId } = await request.json();

    if (!achievementId) {
      return NextResponse.json({ error: 'Achievement ID required' }, { status: 400 });
    }

    // Get the user achievement
    const userAchievement = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId: user.id,
          achievementId,
        },
      },
      include: { achievement: true },
    });

    if (!userAchievement) {
      return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
    }

    if (!userAchievement.unlockedAt) {
      return NextResponse.json({ error: 'Achievement not yet unlocked' }, { status: 400 });
    }

    if (userAchievement.rewardClaimed) {
      return NextResponse.json({ error: 'Reward already claimed' }, { status: 400 });
    }

    const coinReward = Number(userAchievement.achievement.coinReward);

    // Update user coins and mark reward as claimed
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { coins: { increment: coinReward } },
      }),
      prisma.userAchievement.update({
        where: { id: userAchievement.id },
        data: { rewardClaimed: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      coinsAwarded: coinReward,
      newBalance: Number(updatedUser.coins),
      achievementName: userAchievement.achievement.name,
    });
  } catch (error) {
    console.error('Error claiming achievement reward:', error);
    return NextResponse.json({ error: 'Failed to claim reward' }, { status: 500 });
  }
}

// POST: Claim all unclaimed rewards at once
export async function PUT(request: Request) {
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

    // Get all unlocked but unclaimed achievements
    const unclaimedAchievements = await prisma.userAchievement.findMany({
      where: {
        userId: user.id,
        unlockedAt: { not: null },
        rewardClaimed: false,
      },
      include: { achievement: true },
    });

    if (unclaimedAchievements.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No rewards to claim',
        coinsAwarded: 0,
        newBalance: Number(user.coins),
      });
    }

    // Calculate total coins to award
    const totalCoins = unclaimedAchievements.reduce(
      (sum, ua) => sum + Number(ua.achievement.coinReward), 
      0
    );

    // Update user coins and mark all rewards as claimed
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { coins: { increment: totalCoins } },
      }),
      ...unclaimedAchievements.map(ua =>
        prisma.userAchievement.update({
          where: { id: ua.id },
          data: { rewardClaimed: true },
        })
      ),
    ]);

    return NextResponse.json({
      success: true,
      achievementsClaimed: unclaimedAchievements.length,
      coinsAwarded: totalCoins,
      newBalance: Number(updatedUser.coins),
    });
  } catch (error) {
    console.error('Error claiming all rewards:', error);
    return NextResponse.json({ error: 'Failed to claim rewards' }, { status: 500 });
  }
}
