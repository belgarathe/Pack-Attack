import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  heartbeatInterval: NodeJS.Timeout | undefined;
  lastHealthyTime: number | undefined;
  reconnectInProgress: boolean | undefined;
};

// Maximum retries for database operations
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;
const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
const ENGINE_RESTART_THRESHOLD_MS = 60000; // Force engine restart if unhealthy for 60s

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
  // Check for generic connection errors including "Engine is not yet connected"
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('connection') || 
           message.includes('timeout') ||
           message.includes('econnrefused') ||
           message.includes('econnreset') ||
           message.includes('closed') ||
           message.includes('engine is not yet connected') ||
           message.includes('engine is not running');
  }
  return false;
}

// Check if error requires a full engine restart (not just reconnect)
function requiresEngineRestart(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('engine is not yet connected') ||
           message.includes('engine is not running') ||
           message.includes('rust panic');
  }
  return error instanceof Prisma.PrismaClientRustPanicError;
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a database operation with automatic retry on connection errors
 * Includes automatic reconnection attempts after multiple failures
 * Will force recreate the Prisma client if the engine is in a bad state
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  let lastError: unknown;
  let reconnectAttempted = false;
  let engineRestartAttempted = false;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await operation();
      // Mark successful operation
      globalForPrisma.lastHealthyTime = Date.now();
      return result;
    } catch (error) {
      lastError = error;
      
      if (isConnectionError(error) && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.min(attempt, 3); // Cap exponential backoff
        console.warn(
          `[Prisma] Database connection error${context ? ` in ${context}` : ''}, ` +
          `retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})...`,
          error instanceof Error ? error.message : 'Unknown error'
        );
        
        // If error requires engine restart, do it immediately
        if (requiresEngineRestart(error) && !engineRestartAttempted) {
          engineRestartAttempted = true;
          console.log('[Prisma] Engine failure detected, forcing client recreation...');
          try {
            await forceRecreateClient();
            console.log('[Prisma] Client recreated successfully');
          } catch (restartError) {
            console.error('[Prisma] Client recreation failed:', 
              restartError instanceof Error ? restartError.message : 'Unknown error');
          }
          await sleep(delay);
          continue;
        }
        
        // After 2 failed attempts, try standard reconnect
        if (attempt >= 2 && !reconnectAttempted && !engineRestartAttempted) {
          reconnectAttempted = true;
          console.log('[Prisma] Attempting database reconnection...');
          try {
            const client = globalForPrisma.prisma;
            if (client) {
              await client.$disconnect();
              await client.$connect();
            }
            console.log('[Prisma] Reconnection successful');
          } catch (reconnectError) {
            console.error('[Prisma] Reconnection failed:', 
              reconnectError instanceof Error ? reconnectError.message : 'Unknown error');
            
            // If reconnection fails, try full restart
            if (!engineRestartAttempted) {
              engineRestartAttempted = true;
              try {
                await forceRecreateClient();
              } catch {
                // Ignore - will retry on next attempt
              }
            }
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
  // Connection pool settings are configured via DATABASE_URL query params:
  // ?connection_limit=10&pool_timeout=30
  // 
  // Recommended DATABASE_URL format:
  // postgresql://user:pass@host:5432/db?sslmode=require&connection_limit=10&pool_timeout=30
  const client = new PrismaClient({
    // Log only errors in production, more verbose in development
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn']
      : ['error', 'warn'],
  });
  
  // Mark connection as healthy when created
  globalForPrisma.lastHealthyTime = Date.now();
  
  return client;
}

/**
 * Force recreate the Prisma client when the engine is in a bad state
 * This is necessary when the Prisma Query Engine crashes and can't recover
 */
async function forceRecreateClient(): Promise<PrismaClient> {
  if (globalForPrisma.reconnectInProgress) {
    // Wait for ongoing reconnection
    await sleep(500);
    return globalForPrisma.prisma!;
  }
  
  globalForPrisma.reconnectInProgress = true;
  console.log('[Prisma] Force recreating client due to engine failure...');
  
  try {
    // Try to cleanly disconnect the old client
    if (globalForPrisma.prisma) {
      try {
        await Promise.race([
          globalForPrisma.prisma.$disconnect(),
          sleep(5000) // Timeout disconnect after 5s
        ]);
      } catch {
        // Ignore disconnect errors - the client is already broken
      }
    }
    
    // Create a completely new client
    const newClient = createPrismaClient();
    
    // Test the new client
    await newClient.$queryRaw`SELECT 1`;
    
    // Replace the global client
    globalForPrisma.prisma = newClient;
    globalForPrisma.lastHealthyTime = Date.now();
    
    console.log('[Prisma] Successfully recreated client');
    return newClient;
  } catch (error) {
    console.error('[Prisma] Failed to recreate client:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  } finally {
    globalForPrisma.reconnectInProgress = false;
  }
}

// Create or reuse the Prisma client
const prismaInstance: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

// Export a getter that can return a fresh client if needed
// Using a Proxy ensures we always access the current globalForPrisma.prisma
// which may be recreated after connection failures
export const prisma: PrismaClient = new Proxy(prismaInstance, {
  get(_target, prop: string | symbol) {
    // Always use the current instance from globalForPrisma
    const client = globalForPrisma.prisma ?? prismaInstance;
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  }
});

// Cache the Prisma client globally to prevent connection pool exhaustion
// This is critical for production stability - without this, each request
// creates a new connection which can exhaust the database connection pool
globalForPrisma.prisma = prismaInstance;
globalForPrisma.lastHealthyTime = Date.now();

// Heartbeat mechanism to keep database connections alive
// This prevents connection timeout issues by periodically pinging the database
function startHeartbeat(): void {
  // Clear any existing heartbeat
  if (globalForPrisma.heartbeatInterval) {
    clearInterval(globalForPrisma.heartbeatInterval);
  }
  
  let consecutiveFailures = 0;
  
  globalForPrisma.heartbeatInterval = setInterval(async () => {
    try {
      const client = globalForPrisma.prisma;
      if (!client) {
        console.warn('[Prisma] No client available for heartbeat');
        return;
      }
      
      await client.$queryRaw`SELECT 1`;
      // Success - reset failure counter and update healthy time
      consecutiveFailures = 0;
      globalForPrisma.lastHealthyTime = Date.now();
    } catch (error) {
      consecutiveFailures++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[Prisma] Heartbeat failed (${consecutiveFailures} consecutive), attempting reconnection...`, errorMessage);
      
      // Check if we need a full engine restart
      const needsRestart = requiresEngineRestart(error) || consecutiveFailures >= 3;
      
      if (needsRestart) {
        console.log('[Prisma] Forcing client recreation due to persistent failures...');
        try {
          await forceRecreateClient();
          consecutiveFailures = 0;
          console.log('[Prisma] Client recreated successfully after heartbeat failure');
        } catch (restartError) {
          console.error('[Prisma] Client recreation failed:', 
            restartError instanceof Error ? restartError.message : 'Unknown error');
        }
      } else {
        // Try standard reconnection first
        try {
          const client = globalForPrisma.prisma;
          if (client) {
            await client.$disconnect();
            await client.$connect();
          }
          consecutiveFailures = 0;
          globalForPrisma.lastHealthyTime = Date.now();
          console.log('[Prisma] Reconnected successfully after heartbeat failure');
        } catch (reconnectError) {
          console.error('[Prisma] Reconnection failed:', 
            reconnectError instanceof Error ? reconnectError.message : 'Unknown error');
        }
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
  
  const client = globalForPrisma.prisma;
  if (client) {
    await client.$disconnect();
  }
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
    const client = globalForPrisma.prisma;
    if (!client) return false;
    await client.$queryRaw`SELECT 1`;
    globalForPrisma.lastHealthyTime = Date.now();
    return true;
  } catch (error) {
    console.error('[Prisma] Database health check failed:', error);
    
    // If health check fails with engine error, try to recreate client
    if (requiresEngineRestart(error)) {
      try {
        await forceRecreateClient();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

/**
 * Reconnect to database after connection loss
 * Useful for manual recovery in edge cases
 * Will force recreate the client if simple reconnect fails
 */
export async function reconnectDatabase(): Promise<void> {
  try {
    const client = globalForPrisma.prisma;
    if (client) {
      await client.$disconnect();
      await client.$connect();
    }
    globalForPrisma.lastHealthyTime = Date.now();
    console.log('[Prisma] Successfully reconnected to database');
  } catch (error) {
    console.error('[Prisma] Standard reconnect failed, forcing client recreation:', error);
    // Force recreate if standard reconnect fails
    await forceRecreateClient();
  }
}

/**
 * Get the time since last healthy database connection
 * @returns milliseconds since last successful query, or -1 if never healthy
 */
export function getTimeSinceLastHealthy(): number {
  if (!globalForPrisma.lastHealthyTime) return -1;
  return Date.now() - globalForPrisma.lastHealthyTime;
}
