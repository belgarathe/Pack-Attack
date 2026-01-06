import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Connection pool settings for production stability
const PRISMA_CONNECTION_OPTIONS = {
  // Log only errors in production, more verbose in development
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] as Prisma.LogLevel[]
    : ['error'] as Prisma.LogLevel[],
  
  // Configure connection pool for stability
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient(PRISMA_CONNECTION_OPTIONS);
  
  // Add middleware for connection error handling
  client.$use(async (params, next) => {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await next(params);
      } catch (error) {
        const isConnectionError = 
          error instanceof Prisma.PrismaClientKnownRequestError && 
          (error.code === 'P1001' || error.code === 'P1002' || error.code === 'P1003');
        
        const isTimeoutError = 
          error instanceof Prisma.PrismaClientKnownRequestError && 
          error.code === 'P1008';
        
        if ((isConnectionError || isTimeoutError) && attempt < maxRetries) {
          console.warn(
            `[Prisma] Database connection error (${error instanceof Error ? (error as Prisma.PrismaClientKnownRequestError).code : 'unknown'}), ` +
            `retrying in ${retryDelay}ms (attempt ${attempt}/${maxRetries})...`
          );
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        }
        
        // Log the error for monitoring
        console.error('[Prisma] Database operation failed:', {
          model: params.model,
          action: params.action,
          error: error instanceof Error ? error.message : 'Unknown error',
          code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
        });
        
        throw error;
      }
    }
    
    // This shouldn't be reached, but TypeScript needs it
    throw new Error('Max retries exceeded');
  });
  
  return client;
}

// Create or reuse the Prisma client
export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

// Cache the Prisma client globally to prevent connection pool exhaustion
// This is critical for production stability - without this, each request
// creates a new connection which can exhaust the database connection pool
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
} else {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown handling
const gracefulShutdown = async () => {
  console.log('[Prisma] Disconnecting from database...');
  await prisma.$disconnect();
  console.log('[Prisma] Disconnected successfully');
};

// Handle process termination signals
if (typeof process !== 'undefined') {
  process.on('beforeExit', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

/**
 * Health check function to verify database connectivity
 * @returns Promise<boolean> - true if database is accessible
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('[Prisma] Database health check failed:', error);
    return false;
  }
}

/**
 * Reconnect to database after connection loss
 * Useful for manual recovery in edge cases
 */
export async function reconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    await prisma.$connect();
    console.log('[Prisma] Successfully reconnected to database');
  } catch (error) {
    console.error('[Prisma] Failed to reconnect to database:', error);
    throw error;
  }
}
