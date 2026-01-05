import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Get comprehensive stats
    const [
      totalPulls,
      totalBattles,
      battlesWon,
      totalOrders,
      pendingOrders,
      totalSales,
      totalCoinsEarned,
      recentPulls,
      rarityBreakdown,
      gameBreakdown,
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
      
      // Rarity breakdown
      prisma.pull.groupBy({
        by: ['cardId'],
        where: { userId: user.id, cardId: { not: null } },
        _count: true,
      }).then(async (pulls) => {
        const cardIds = pulls.map(p => p.cardId).filter(Boolean) as string[];
        const cards = await prisma.card.findMany({
          where: { id: { in: cardIds } },
          select: { id: true, rarity: true },
        });
        
        const rarityMap: Record<string, number> = {};
        pulls.forEach(pull => {
          const card = cards.find(c => c.id === pull.cardId);
          if (card) {
            const rarity = card.rarity || 'common';
            rarityMap[rarity] = (rarityMap[rarity] || 0) + pull._count;
          }
        });
        return rarityMap;
      }),
      
      // Game breakdown
      prisma.pull.groupBy({
        by: ['cardId'],
        where: { userId: user.id, cardId: { not: null } },
        _count: true,
      }).then(async (pulls) => {
        const cardIds = pulls.map(p => p.cardId).filter(Boolean) as string[];
        const cards = await prisma.card.findMany({
          where: { id: { in: cardIds } },
          select: { id: true, sourceGame: true },
        });
        
        const gameMap: Record<string, number> = {};
        pulls.forEach(pull => {
          const card = cards.find(c => c.id === pull.cardId);
          if (card) {
            const game = card.sourceGame || 'MAGIC_THE_GATHERING';
            gameMap[game] = (gameMap[game] || 0) + pull._count;
          }
        });
        return gameMap;
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
        totalCoinsEarned: totalCoinsEarned._sum.coinsReceived || 0,
        collectionValue: Number(collectionValue._sum.cardValue || 0),
        currentCoins: user.coins,
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

