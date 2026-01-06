import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  heartbeatInterval: NodeJS.Timeout | undefined;
};

// Maximum retries for database operations
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;
const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

// Helper function to check if error is a connection error
function isConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P1001: Can't reach database server
    // P1002: Database server was reached but timed out
    // P1003: Database does not exist
    // P1008: Operations timed out
    // P1017: Server closed the connection
    // P2024: Timed out fetching a connection from pool
    // P2025: Record not found (can happen during reconnection)
    return ['P1001', 'P1002', 'P1003', 'P1008', 'P1017', 'P2024'].includes(error.code);
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return true;
  }
  // Check for generic connection errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('connection') || 
           message.includes('timeout') ||
           message.includes('econnrefused') ||
           message.includes('econnreset') ||
           message.includes('closed');
  }
  return false;
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a database operation with automatic retry on connection errors
 * Includes automatic reconnection attempts after multiple failures
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  let lastError: unknown;
  let reconnectAttempted = false;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (isConnectionError(error) && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.min(attempt, 3); // Cap exponential backoff
        console.warn(
          `[Prisma] Database connection error${context ? ` in ${context}` : ''}, ` +
          `retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})...`,
          error instanceof Error ? error.message : 'Unknown error'
        );
        
        // After 2 failed attempts, try to reconnect
        if (attempt >= 2 && !reconnectAttempted) {
          reconnectAttempted = true;
          console.log('[Prisma] Attempting database reconnection...');
          try {
            await prisma.$disconnect();
            await prisma.$connect();
            console.log('[Prisma] Reconnection successful');
          } catch (reconnectError) {
            console.error('[Prisma] Reconnection failed:', 
              reconnectError instanceof Error ? reconnectError.message : 'Unknown error');
          }
        }
        
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
      : ['error', 'warn'],
  });
  
  return client;
}

// Create or reuse the Prisma client
export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

// Cache the Prisma client globally to prevent connection pool exhaustion
// This is critical for production stability - without this, each request
// creates a new connection which can exhaust the database connection pool
globalForPrisma.prisma = prisma;

// Heartbeat mechanism to keep database connections alive
// This prevents connection timeout issues by periodically pinging the database
function startHeartbeat(): void {
  // Clear any existing heartbeat
  if (globalForPrisma.heartbeatInterval) {
    clearInterval(globalForPrisma.heartbeatInterval);
  }
  
  globalForPrisma.heartbeatInterval = setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      // Silent success - no need to log every heartbeat
    } catch (error) {
      console.warn('[Prisma] Heartbeat failed, attempting reconnection...', 
        error instanceof Error ? error.message : 'Unknown error');
      
      try {
        await prisma.$disconnect();
        await prisma.$connect();
        console.log('[Prisma] Reconnected successfully after heartbeat failure');
      } catch (reconnectError) {
        console.error('[Prisma] Reconnection failed:', 
          reconnectError instanceof Error ? reconnectError.message : 'Unknown error');
      }
    }
  }, HEARTBEAT_INTERVAL_MS);
  
  // Prevent the interval from keeping the process alive
  if (globalForPrisma.heartbeatInterval.unref) {
    globalForPrisma.heartbeatInterval.unref();
  }
}

// Start heartbeat in production to prevent connection timeouts
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DB_HEARTBEAT === 'true') {
  startHeartbeat();
  console.log('[Prisma] Database heartbeat started (interval: 30s)');
}

// Graceful shutdown handling
const gracefulShutdown = async () => {
  console.log('[Prisma] Disconnecting from database...');
  
  // Clear heartbeat interval
  if (globalForPrisma.heartbeatInterval) {
    clearInterval(globalForPrisma.heartbeatInterval);
    globalForPrisma.heartbeatInterval = undefined;
  }
  
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
