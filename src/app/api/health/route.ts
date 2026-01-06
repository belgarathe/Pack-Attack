import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/prisma';

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

  // Check memory usage (Node.js process)
  const memoryUsage = process.memoryUsage();
  const heapUsed = memoryUsage.heapUsed;
  const heapTotal = memoryUsage.heapTotal;
  const memoryPercentage = Math.round((heapUsed / heapTotal) * 100);

  healthStatus.checks.memory = {
    used: Math.round(heapUsed / 1024 / 1024), // MB
    total: Math.round(heapTotal / 1024 / 1024), // MB
    percentage: memoryPercentage,
  };

  // Mark as degraded if memory usage is high
  if (memoryPercentage > 90) {
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


