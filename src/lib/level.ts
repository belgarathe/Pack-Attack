import { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Pure math helpers
// ---------------------------------------------------------------------------

/** XP required to advance FROM `level` to `level + 1` */
export function xpForNextLevel(level: number): number {
  return 100 * level * level;
}

/** Total XP required to reach level `L` from level 1 (closed-form sum) */
export function totalXpForLevel(level: number): number {
  if (level <= 1) return 0;
  const L = level - 1; // number of level-ups completed
  return Math.round((100 * L * (L + 1) * (2 * L + 1)) / 6);
}

/** Derive current level from lifetime XP */
export function levelFromXp(totalXp: number): number {
  let level = 1;
  while (totalXp >= totalXpForLevel(level + 1)) {
    level++;
    if (level >= 1000) break; // safety cap
  }
  return level;
}

/** Coins awarded upon reaching this level */
export function coinsForLevelUp(level: number): number {
  if (level <= 10) return 5;
  if (level === 15) return 10 + 25; // base 10 + milestone
  if (level === 25) return 10 + 50;
  if (level === 40) return 15 + 75;
  if (level === 50) return 15 + 100;
  if (level >= 51 && level % 10 === 0) return 50; // every 10 levels
  if (level <= 25) return 10;
  if (level <= 50) return 15;
  return 0; // 51+ non-milestone
}

/** Title string for a given level */
export function titleForLevel(level: number): string {
  if (level >= 50) return 'Challenger';
  if (level >= 35) return 'Grandmaster';
  if (level >= 20) return 'Master';
  if (level >= 10) return 'Elite';
  if (level >= 5) return 'Collector';
  return 'Rookie';
}

/** XP progress within the current level */
export function xpProgressInCurrentLevel(
  totalXp: number,
  level: number
): { current: number; required: number; percent: number } {
  const xpAtCurrentLevel = totalXpForLevel(level);
  const required = xpForNextLevel(level);
  const current = totalXp - xpAtCurrentLevel;
  const percent = required > 0 ? Math.min(100, Math.round((current / required) * 100)) : 100;
  return { current, required, percent };
}

// ---------------------------------------------------------------------------
// DB helper
// ---------------------------------------------------------------------------

export interface AwardXpResult {
  newLevel: number;
  levelsGained: number;
  coinsAwarded: number;
  leveledUp: boolean;
}

const MONTHLY_CAP = 500;

/**
 * Award XP to a user, handle level-ups, coin rewards, and monthly cap.
 * Runs inside a Prisma transaction to avoid race conditions.
 */
export async function awardXp(
  userId: string,
  xpAmount: number,
  prismaClient: PrismaClient
): Promise<AwardXpResult> {
  return prismaClient.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        xp: true,
        level: true,
        levelCoinsEarnedThisMonth: true,
        levelCoinsPending: true,
        levelCoinsMonthStart: true,
        coins: true,
      },
    });

    if (!user) throw new Error(`User ${userId} not found`);

    const now = new Date();

    // Determine if we've rolled into a new calendar month
    const monthStart = user.levelCoinsMonthStart;
    const isNewMonth =
      now.getFullYear() > monthStart.getFullYear() ||
      now.getMonth() > monthStart.getMonth();

    let coinsEarnedThisMonth = user.levelCoinsEarnedThisMonth;
    let coinsPending = user.levelCoinsPending;
    let coinsToCredit = 0;

    // Pay out deferred coins at the start of a new month
    if (isNewMonth && coinsPending > 0) {
      coinsToCredit += coinsPending;
      coinsPending = 0;
      coinsEarnedThisMonth = 0;
    } else if (isNewMonth) {
      coinsEarnedThisMonth = 0;
    }

    // Calculate new XP and levels
    const newTotalXp = user.xp + xpAmount;
    const oldLevel = user.level;
    const newLevel = levelFromXp(newTotalXp);
    const levelsGained = newLevel - oldLevel;

    // Compute coins for each new level
    let newLevelCoins = 0;
    for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
      newLevelCoins += coinsForLevelUp(lvl);
    }

    // Apply monthly cap: split new coins into immediate vs deferred
    if (newLevelCoins > 0) {
      const remaining = MONTHLY_CAP - coinsEarnedThisMonth;
      if (remaining <= 0) {
        // Already capped — defer all
        coinsPending += newLevelCoins;
      } else if (newLevelCoins <= remaining) {
        // Fits within cap
        coinsToCredit += newLevelCoins;
        coinsEarnedThisMonth += newLevelCoins;
      } else {
        // Partially within cap
        coinsToCredit += remaining;
        coinsEarnedThisMonth += remaining;
        coinsPending += newLevelCoins - remaining;
      }
    }

    // Persist
    await tx.user.update({
      where: { id: userId },
      data: {
        xp: newTotalXp,
        level: newLevel,
        coins: { increment: coinsToCredit },
        levelCoinsEarnedThisMonth: coinsEarnedThisMonth,
        levelCoinsPending: coinsPending,
        levelCoinsMonthStart: isNewMonth ? now : undefined,
      },
    });

    return {
      newLevel,
      levelsGained,
      coinsAwarded: coinsToCredit,
      leveledUp: levelsGained > 0,
    };
  });
}
