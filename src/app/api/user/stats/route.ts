import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
  try {
    // SECURITY: Rate limit expensive stats queries
    const rateLimitResult = await rateLimit(request as never, 'general');
    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response;
    }

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

    // PERFORMANCE: Optimized queries - fetch card data once and compute breakdowns in memory
    // This eliminates the N+1 query pattern from the previous implementation
    
    const [
      totalPulls,
      totalBattles,
      battlesWon,
      totalOrders,
      pendingOrders,
      totalSales,
      totalCoinsEarned,
      recentPulls,
      pullsWithCards, // Single query to get all pull data with cards
      monthlyPulls,
    ] = await Promise.all([
      // Total pulls
      prisma.pull.count({ where: { userId: user.id } }),
      
      // Total battles participated
      prisma.battleParticipant.count({ where: { userId: user.id } }),
      
      // Battles won
      prisma.battle.count({ where: { winnerId: user.id } }),
      
      // Total orders
      prisma.order.count({ where: { userId: user.id } }),
      
      // Pending orders
      prisma.order.count({ 
        where: { 
          userId: user.id,
          status: { in: ['PENDING', 'PROCESSING'] }
        } 
      }),
      
      // Total cards sold
      prisma.saleHistory.count({ where: { userId: user.id } }),
      
      // Total coins earned from sales
      prisma.saleHistory.aggregate({
        where: { userId: user.id },
        _sum: { coinsReceived: true },
      }),
      
      // Recent pulls (last 10)
      prisma.pull.findMany({
        where: { userId: user.id },
        include: {
          card: {
            select: {
              name: true,
              rarity: true,
              coinValue: true,
              imageUrlGatherer: true,
              sourceGame: true,
            },
          },
          box: {
            select: { name: true },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
      }),
      
      // PERFORMANCE: Single query for rarity and game breakdown
      // Fetch all pulls with card data in ONE query instead of N+1
      prisma.pull.findMany({
        where: { 
          userId: user.id, 
          cardId: { not: null } 
        },
        select: {
          card: {
            select: {
              rarity: true,
              sourceGame: true,
            },
          },
        },
      }),
      
      // Monthly pulls (last 6 months)
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', timestamp) as month,
          COUNT(*) as count
        FROM "Pull"
        WHERE "userId" = ${user.id}
          AND timestamp >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', timestamp)
        ORDER BY month DESC
      ` as Promise<Array<{ month: Date; count: bigint }>>,
    ]);

    // PERFORMANCE: Compute breakdowns in memory from single query result
    const rarityBreakdown: Record<string, number> = {};
    const gameBreakdown: Record<string, number> = {};
    
    for (const pull of pullsWithCards) {
      if (pull.card) {
        // Rarity breakdown
        const rarity = pull.card.rarity || 'common';
        rarityBreakdown[rarity] = (rarityBreakdown[rarity] || 0) + 1;
        
        // Game breakdown
        const game = pull.card.sourceGame || 'MAGIC_THE_GATHERING';
        gameBreakdown[game] = (gameBreakdown[game] || 0) + 1;
      }
    }

    // Calculate win rate
    const winRate = totalBattles > 0 
      ? Math.round((battlesWon / totalBattles) * 100) 
      : 0;

    // Calculate collection value
    const collectionValue = await prisma.pull.aggregate({
      where: { 
        userId: user.id,
        card: { isNot: null },
      },
      _sum: { cardValue: true },
    });

    return NextResponse.json({
      stats: {
        totalPulls,
        totalBattles,
        battlesWon,
        winRate,
        totalOrders,
        pendingOrders,
        totalSales,
        totalCoinsEarned: Number(totalCoinsEarned._sum.coinsReceived || 0),
        collectionValue: Number(collectionValue._sum.cardValue || 0),
        currentCoins: Number(user.coins),
      },
      recentPulls,
      rarityBreakdown,
      gameBreakdown,
      monthlyPulls: (monthlyPulls as Array<{ month: Date; count: bigint }>).map(m => ({
        month: m.month,
        count: Number(m.count),
      })),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}









