/**
 * Rate limiting utility for API endpoints
 * Prevents abuse and ensures fair usage
 * 
 * STABILITY: Includes memory management to prevent unbounded growth
 */

import { NextRequest } from 'next/server';

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max number of unique tokens per interval
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitStore {
  [key: string]: RateLimitEntry;
}

// Maximum entries to prevent memory exhaustion
const MAX_STORE_ENTRIES = 10000;
// Cleanup interval (every 60 seconds)
const CLEANUP_INTERVAL_MS = 60000;

class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;
  private lastCleanup: number = Date.now();
  private entryCount: number = 0;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  private getKey(identifier: string): string {
    return `rate_limit:${identifier}`;
  }

  private cleanup(force: boolean = false) {
    const now = Date.now();
    
    // Only cleanup if forced or enough time has passed
    if (!force && now - this.lastCleanup < CLEANUP_INTERVAL_MS) {
      return;
    }
    
    this.lastCleanup = now;
    let removed = 0;
    
    // Clean up expired entries
    const keys = Object.keys(this.store);
    for (const key of keys) {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
        removed++;
      }
    }
    
    this.entryCount = Object.keys(this.store).length;
    
    if (removed > 0) {
      console.log(`[RateLimiter] Cleaned up ${removed} expired entries, ${this.entryCount} remaining`);
    }
  }

  /**
   * Emergency cleanup when store is too large
   * Removes oldest entries first
   */
  private emergencyCleanup() {
    console.warn(`[RateLimiter] Emergency cleanup triggered - store has ${this.entryCount} entries`);
    
    const now = Date.now();
    const entries = Object.entries(this.store)
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => a.resetTime - b.resetTime);
    
    // Remove oldest 20% of entries
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      delete this.store[entries[i].key];
    }
    
    this.entryCount = Object.keys(this.store).length;
    console.log(`[RateLimiter] Removed ${toRemove} oldest entries, ${this.entryCount} remaining`);
  }

  check(identifier: string): { success: boolean; remaining: number; resetTime: number } {
    // Periodic cleanup
    this.cleanup();
    
    // Emergency cleanup if store is too large
    if (this.entryCount >= MAX_STORE_ENTRIES) {
      this.emergencyCleanup();
    }
    
    const key = this.getKey(identifier);
    const now = Date.now();
    
    if (!this.store[key] || this.store[key].resetTime < now) {
      // Track if this is a new entry
      const isNewEntry = !this.store[key];
      
      // Create new rate limit window
      this.store[key] = {
        count: 1,
        resetTime: now + this.config.interval,
      };
      
      if (isNewEntry) {
        this.entryCount++;
      }
      
      return {
        success: true,
        remaining: this.config.uniqueTokenPerInterval - 1,
        resetTime: this.store[key].resetTime,
      };
    }
    
    // Check if limit exceeded
    if (this.store[key].count >= this.config.uniqueTokenPerInterval) {
      return {
        success: false,
        remaining: 0,
        resetTime: this.store[key].resetTime,
      };
    }
    
    // Increment counter
    this.store[key].count++;
    
    return {
      success: true,
      remaining: this.config.uniqueTokenPerInterval - this.store[key].count,
      resetTime: this.store[key].resetTime,
    };
  }
}

// Create rate limiters for different endpoints
const rateLimiters = {
  // General API rate limit: 100 requests per minute
  general: new RateLimiter({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 100,
  }),
  
  // Auth endpoints: 5 attempts per 15 minutes
  auth: new RateLimiter({
    interval: 15 * 60 * 1000, // 15 minutes
    uniqueTokenPerInterval: 5,
  }),
  
  // Box opening: 10 per minute
  boxOpening: new RateLimiter({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 10,
  }),
  
  // Battle creation: 5 per minute
  battleCreation: new RateLimiter({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 5,
  }),
  
  // Battle joining: 10 per minute
  battleJoin: new RateLimiter({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 10,
  }),
  
  // Payment endpoints: 3 per minute
  payment: new RateLimiter({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 3,
  }),
};

/**
 * Get client identifier from request
 * Uses IP address or user ID if authenticated
 */
export function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';
  
  // You could also use user ID if authenticated
  // const userId = await getUserIdFromSession(request);
  // if (userId) return `user:${userId}`;
  
  return `ip:${ip}`;
}

/**
 * Rate limit middleware for API routes
 */
export async function rateLimit(
  request: NextRequest,
  limiterType: keyof typeof rateLimiters = 'general'
): Promise<{ success: boolean; remaining: number; resetTime: number; response?: Response }> {
  const identifier = getClientIdentifier(request);
  const limiter = rateLimiters[limiterType];
  const result = limiter.check(identifier);
  
  if (!result.success) {
    const resetDate = new Date(result.resetTime).toISOString();
    
    return {
      ...result,
      response: new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again after ${resetDate}`,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(limiter['config'].uniqueTokenPerInterval),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': resetDate,
            'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
          },
        }
      ),
    };
  }
  
  return result;
}

/**
 * Rate limit decorator for API route handlers
 * Usage: 
 * export const POST = withRateLimit(async (request) => {...}, 'auth');
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<Response>,
  limiterType: keyof typeof rateLimiters = 'general'
) {
  return async (request: NextRequest): Promise<Response> => {
    const rateLimitResult = await rateLimit(request, limiterType);
    
    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response;
    }
    
    const response = await handler(request);
    
    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());
    
    return response;
  };
}


