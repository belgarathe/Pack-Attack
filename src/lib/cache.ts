/**
 * Server-side caching utilities for Pack Attack
 * Provides in-memory caching with TTL and automatic cleanup
 */

// ============================================================================
// Cache Configuration
// ============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheConfig {
  maxEntries: number;
  defaultTTL: number; // milliseconds
  cleanupInterval: number; // milliseconds
}

const DEFAULT_CONFIG: CacheConfig = {
  maxEntries: 1000,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  cleanupInterval: 60 * 1000, // 1 minute
};

// ============================================================================
// Generic Cache Class
// ============================================================================

class Cache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private hits = 0;
  private misses = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);

    // Don't keep process alive just for cleanup
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.store) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
        removed++;
      }
    }

    // Emergency cleanup if over limit
    if (this.store.size > this.config.maxEntries) {
      const entriesToRemove = this.store.size - this.config.maxEntries + 100;
      const entries = Array.from(this.store.entries())
        .sort((a, b) => a[1].createdAt - b[1].createdAt);

      for (let i = 0; i < entriesToRemove && i < entries.length; i++) {
        this.store.delete(entries[i][0]);
        removed++;
      }
    }
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    return entry.data;
  }

  set(key: string, data: T, ttl: number = this.config.defaultTTL): void {
    const now = Date.now();

    this.store.set(key, {
      data,
      expiresAt: now + ttl,
      createdAt: now,
    });
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  getStats(): { hits: number; misses: number; size: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.store.size,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Get or fetch data with automatic caching
   */
  async getOrFetch(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }
}

// ============================================================================
// Global Cache Instances
// ============================================================================

// Cache for box data (boxes don't change frequently)
export const boxCache = new Cache<unknown>({
  maxEntries: 200,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
});

// Cache for card data within boxes (for random card selection)
export const cardCache = new Cache<unknown>({
  maxEntries: 500,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
});

// Cache for user data (short TTL for freshness)
export const userCache = new Cache<unknown>({
  maxEntries: 1000,
  defaultTTL: 30 * 1000, // 30 seconds
});

// Cache for leaderboard data
export const leaderboardCache = new Cache<unknown>({
  maxEntries: 50,
  defaultTTL: 60 * 1000, // 1 minute
});

// Cache for shop products
export const shopCache = new Cache<unknown>({
  maxEntries: 500,
  defaultTTL: 2 * 60 * 1000, // 2 minutes
});

// Cache for battle list
export const battleCache = new Cache<unknown>({
  maxEntries: 100,
  defaultTTL: 10 * 1000, // 10 seconds (battles change frequently)
});

// Cache for achievements payloads (short TTL, per user)
export const achievementsCache = new Cache<unknown>({
  maxEntries: 2000,
  defaultTTL: 30 * 1000, // 30 seconds
});

// ============================================================================
// Cache Key Generators
// ============================================================================

export const cacheKeys = {
  box: (id: string) => `box:${id}`,
  boxCards: (boxId: string) => `box-cards:${boxId}`,
  boxList: (page?: number) => `box-list:${page ?? 'all'}`,
  user: (id: string) => `user:${id}`,
  userByEmail: (email: string) => `user-email:${email}`,
  userAchievements: (userId: string) => `user-achievements:${userId}`,
  battles: (status?: string) => `battles:${status ?? 'all'}`,
  leaderboard: (period: string) => `leaderboard:${period}`,
  shopProducts: (shopId?: string) => `shop-products:${shopId ?? 'all'}`,
  achievements: () => 'achievements:all',
};

// ============================================================================
// Cache Invalidation Helpers
// ============================================================================

export function invalidateBoxCache(boxId?: string): void {
  if (boxId) {
    boxCache.delete(cacheKeys.box(boxId));
    cardCache.delete(cacheKeys.boxCards(boxId));
  }
  // Clear all box list caches
  boxCache.clear();
}

export function invalidateUserCache(userId?: string, email?: string): void {
  if (userId) userCache.delete(cacheKeys.user(userId));
  if (email) userCache.delete(cacheKeys.userByEmail(email));
}

export function invalidateBattleCache(): void {
  battleCache.clear();
}

export function invalidateLeaderboardCache(): void {
  leaderboardCache.clear();
}

// ============================================================================
// Request Deduplication
// ============================================================================

/**
 * Deduplicates concurrent requests for the same data
 * Useful for preventing thundering herd when cache expires
 */
class RequestDeduplicator {
  private pending = new Map<string, Promise<unknown>>();

  async dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Check if there's already a pending request
    const existing = this.pending.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    // Create new request
    const promise = fetcher().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }
}

export const requestDeduplicator = new RequestDeduplicator();

// ============================================================================
// Memoization Helper
// ============================================================================

/**
 * Memoize a function with automatic cache expiration
 */
export function memoize<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyFn: (...args: TArgs) => string,
  ttl: number = 60000
): (...args: TArgs) => Promise<TResult> {
  const cache = new Cache<TResult>({ defaultTTL: ttl });

  return async (...args: TArgs): Promise<TResult> => {
    const key = keyFn(...args);
    return cache.getOrFetch(key, () => fn(...args), ttl);
  };
}

// ============================================================================
// Cache Statistics Export
// ============================================================================

export function getAllCacheStats(): Record<string, ReturnType<Cache<unknown>['getStats']>> {
  return {
    boxes: boxCache.getStats(),
    cards: cardCache.getStats(),
    users: userCache.getStats(),
    leaderboard: leaderboardCache.getStats(),
    shop: shopCache.getStats(),
    battles: battleCache.getStats(),
  };
}
