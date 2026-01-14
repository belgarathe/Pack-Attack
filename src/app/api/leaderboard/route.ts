import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Prize configuration for top 10
const PRIZE_CONFIG = [
  { rank: 1, prize: 5000, title: 'Champion' },
  { rank: 2, prize: 2500, title: 'Runner Up' },
  { rank: 3, prize: 1000, title: 'Third Place' },
  { rank: 4, prize: 500, title: 'Top 5' },
  { rank: 5, prize: 500, title: 'Top 5' },
  { rank: 6, prize: 250, title: 'Top 10' },
  { rank: 7, prize: 250, title: 'Top 10' },
  { rank: 8, prize: 250, title: 'Top 10' },
  { rank: 9, prize: 250, title: 'Top 10' },
  { rank: 10, prize: 250, title: 'Top 10' },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');
    const period = searchParams.get('period') || 'current'; // 'current' or 'previous'

    const now = new Date();
    let targetMonth: number;
    let targetYear: number;

    if (monthParam && yearParam) {
      targetMonth = parseInt(monthParam);
      targetYear = parseInt(yearParam);
    } else if (period === 'previous') {
      // Previous month
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      targetMonth = prevDate.getMonth() + 1;
      targetYear = prevDate.getFullYear();
    } else {
      // Current month
      targetMonth = now.getMonth() + 1;
      targetYear = now.getFullYear();
    }

    // Calculate start and end dates for the target month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    // Get leaderboard data by aggregating battle wins and participation
    const leaderboardData = await prisma.$queryRaw<Array<{
      userId: string;
      userName: string | null;
      userAvatar: string | null;
      battlesWon: bigint;
      battlesPlayed: bigint;
      totalCoinsWon: bigint;
    }>>`
      SELECT 
        u.id as "userId",
        u.name as "userName",
        u.avatar as "userAvatar",
        COALESCE(COUNT(DISTINCT CASE WHEN b."winnerId" = u.id THEN b.id END), 0) as "battlesWon",
        COALESCE(COUNT(DISTINCT bp."battleId"), 0) as "battlesPlayed",
        COALESCE(SUM(CASE WHEN b."winnerId" = u.id THEN bp."totalValue" ELSE 0 END), 0) as "totalCoinsWon"
      FROM "User" u
      LEFT JOIN "BattleParticipant" bp ON bp."userId" = u.id
      LEFT JOIN "Battle" b ON b.id = bp."battleId" 
        AND b.status = 'FINISHED' 
        AND b."finishedAt" >= ${startDate}
        AND b."finishedAt" <= ${endDate}
      WHERE u."isBot" = false
      GROUP BY u.id, u.name, u.avatar
      HAVING COUNT(DISTINCT bp."battleId") > 0
      ORDER BY 
        COALESCE(SUM(CASE WHEN b."winnerId" = u.id THEN bp."totalValue" ELSE 0 END), 0) DESC,
        COALESCE(COUNT(DISTINCT CASE WHEN b."winnerId" = u.id THEN b.id END), 0) DESC
      LIMIT 100
    `;

    // Calculate points and rank
    const leaderboard = leaderboardData.map((entry, index) => {
      const battlesWon = Number(entry.battlesWon);
      const battlesPlayed = Number(entry.battlesPlayed);
      const totalCoinsWon = Number(entry.totalCoinsWon);
      
      // Points formula: coins won + (battles won * 1000)
      const points = totalCoinsWon + (battlesWon * 1000);
      const rank = index + 1;
      const prizeInfo = PRIZE_CONFIG.find(p => p.rank === rank);

      return {
        rank,
        points,
        userId: entry.userId,
        userName: entry.userName || 'Anonymous',
        userAvatar: entry.userAvatar,
        battlesWon,
        battlesPlayed,
        totalCoinsWon,
        prize: prizeInfo?.prize || 0,
        title: prizeInfo?.title || null,
      };
    });

    // Calculate time until reset
    const nextMonth = new Date(targetYear, targetMonth, 1);
    const timeUntilReset = nextMonth.getTime() - now.getTime();
    const daysUntilReset = Math.floor(timeUntilReset / (1000 * 60 * 60 * 24));
    const hoursUntilReset = Math.floor((timeUntilReset % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutesUntilReset = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));
    const secondsUntilReset = Math.floor((timeUntilReset % (1000 * 60)) / 1000);

    // Get month name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[targetMonth - 1];

    return NextResponse.json({
      success: true,
      leaderboard: leaderboard.slice(0, 10), // Top 10 only
      fullLeaderboard: leaderboard, // All entries for full listing
      month: targetMonth,
      year: targetYear,
      monthName,
      period,
      resetIn: {
        days: daysUntilReset,
        hours: hoursUntilReset,
        minutes: minutesUntilReset,
        seconds: secondsUntilReset,
      },
      prizes: PRIZE_CONFIG,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
