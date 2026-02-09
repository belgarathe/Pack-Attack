import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/prisma';
import { getAllCacheStats, globalMemoryPressureCleanup } from '@/lib/cache';

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
      rss: number; // Resident Set Size (total memory)
    };
    cache?: {
      totalEntries: number;
      stats: Record<string, CacheStats>;
    };
  };
  version: string;
}

const startTime = Date.now();

export async function GET() {
  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks: {
      database: { status: 'down' },
      memory: {
        used: 0,
        total: 0,
        percentage: 0,
        rss: 0,
      },
    },
    version: process.env.npm_package_version || '1.0.0',
  };

  // Check database connectivity with timing
  const dbStart = Date.now();
  try {
    const isDbHealthy = await checkDatabaseHealth();
    healthStatus.checks.database = {
      status: isDbHealthy ? 'up' : 'down',
      latency: Date.now() - dbStart,
    };
    
    if (!isDbHealthy) {
      healthStatus.status = 'unhealthy';
    }
  } catch (error) {
    healthStatus.checks.database = {
      status: 'down',
      latency: Date.now() - dbStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    healthStatus.status = 'unhealthy';
  }

  // Check memory usage - use RSS (actual system memory) not heap percentage
  // Heap percentage is misleading (Node reuses ~90% of small heaps normally)
  const memoryUsage = process.memoryUsage();
  const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);
  // Use RSS against a 1GB limit as the meaningful metric
  const memoryPercentage = Math.round((rssMB / 1024) * 100);

  healthStatus.checks.memory = {
    used: rssMB, // RSS in MB (actual memory footprint)
    total: 1024, // 1GB reference limit
    percentage: memoryPercentage,
    rss: rssMB,
  };

  // Get cache statistics
  try {
    const cacheStats = getAllCacheStats();
    const totalEntries = Object.values(cacheStats).reduce((sum, s) => sum + s.size, 0);
    healthStatus.checks.cache = {
      totalEntries,
      stats: cacheStats,
    };
  } catch {
    // Cache stats are optional
  }

  // Auto-cleanup if RSS memory is critically high (>800MB of 1GB limit)
  if (rssMB > 800) {
    try {
      globalMemoryPressureCleanup();
    } catch {
      // Ignore cleanup errors
    }
  }

  // Mark as degraded if RSS exceeds 700MB
  if (rssMB > 700) {
    healthStatus.status = healthStatus.status === 'unhealthy' ? 'unhealthy' : 'degraded';
  }

  // Return appropriate status code
  const statusCode = healthStatus.status === 'healthy' ? 200 : 
                     healthStatus.status === 'degraded' ? 200 : 503;

  return NextResponse.json(healthStatus, { 
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

// Simple liveness check - always returns 200 if the server is running
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}


