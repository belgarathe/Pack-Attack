import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { titleForLevel, xpProgressInCurrentLevel } from '@/lib/level';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        level: true,
        xp: true,
        levelCoinsPending: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { current, required, percent } = xpProgressInCurrentLevel(user.xp, user.level);

    return NextResponse.json({
      level: user.level,
      xp: user.xp,
      xpInCurrentLevel: current,
      xpForNextLevel: required,
      percent,
      title: titleForLevel(user.level),
      pendingCoins: user.levelCoinsPending,
    });
  } catch (error) {
    console.error('Error fetching level info:', error);
    return NextResponse.json({ error: 'Failed to fetch level info' }, { status: 500 });
  }
}
