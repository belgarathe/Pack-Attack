import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/internal/level-rewards/payout
 * Protected by CRON_SECRET. Pays out pending level-up coins to all users
 * who have deferred rewards from the previous month.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.CRON_SECRET || 'your-secret-key';

    if (authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Fetch all users with pending coins
    const users = await prisma.user.findMany({
      where: { levelCoinsPending: { gt: 0 } },
      select: { id: true, levelCoinsPending: true },
      orderBy: { id: 'asc' },
    });

    let totalPaid = 0;

    for (const user of users) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          coins: { increment: user.levelCoinsPending },
          levelCoinsPending: 0,
          levelCoinsEarnedThisMonth: 0,
          levelCoinsMonthStart: now,
        },
      });
      totalPaid += user.levelCoinsPending;
    }

    console.log(`[LEVEL-REWARDS] Paid out ${totalPaid} coins to ${users.length} users`);

    return NextResponse.json({
      success: true,
      usersProcessed: users.length,
      totalCoinsPaid: totalPaid,
    });
  } catch (error) {
    console.error('[LEVEL-REWARDS] Payout error:', error);
    return NextResponse.json({ error: 'Failed to process payout' }, { status: 500 });
  }
}
