import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Maximum retries for database operations
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Helper function to check if error is a connection error
function isConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P1001: Can't reach database server
    // P1002: Database server was reached but timed out
    // P1003: Database does not exist
    // P1008: Operations timed out
    // P1017: Server closed the connection
    return ['P1001', 'P1002', 'P1003', 'P1008', 'P1017'].includes(error.code);
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  return false;
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a database operation with automatic retry on connection errors
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (isConnectionError(error) && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt;
        console.warn(
          `[Prisma] Database connection error${context ? ` in ${context}` : ''}, ` +
          `retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})...`,
          error instanceof Error ? error.message : 'Unknown error'
        );
        await sleep(delay);
        continue;
      }
      
      // Log and throw for non-retryable errors or max retries exceeded
      console.error('[Prisma] Database operation failed:', {
        context,
        attempt,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
      });
      
      throw error;
    }
  }
  
  // This shouldn't be reached, but TypeScript needs it
  throw lastError;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    // Log only errors in production, more verbose in development
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn']
      : ['error'],
  });
  
  return client;
}

// Create or reuse the Prisma client
export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

// Cache the Prisma client globally to prevent connection pool exhaustion
// This is critical for production stability - without this, each request
// creates a new connection which can exhaust the database connection pool
globalForPrisma.prisma = prisma;

// Graceful shutdown handling
const gracefulShutdown = async () => {
  console.log('[Prisma] Disconnecting from database...');
  await prisma.$disconnect();
  console.log('[Prisma] Disconnected successfully');
};

// Handle process termination signals
if (typeof process !== 'undefined') {
  process.on('beforeExit', gracefulShutdown);
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
