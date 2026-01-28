/**
 * Next.js Instrumentation file
 * This runs when the server starts and sets up global error handlers
 * to prevent crashes from unhandled errors
 */

// Track consecutive fatal errors to prevent infinite restart loops
let consecutiveFatalErrors = 0;
const MAX_FATAL_ERRORS_BEFORE_EXIT = 5;
const FATAL_ERROR_RESET_INTERVAL = 60000; // Reset counter after 60s of stability

// Errors that are recoverable and should NOT crash the server
const RECOVERABLE_ERROR_PATTERNS = [
  'ETIMEDOUT',        // Network timeout - external service unavailable
  'ECONNREFUSED',     // Connection refused - service down
  'ECONNRESET',       // Connection reset - network issue
  'ENOTFOUND',        // DNS resolution failed
  'EAI_AGAIN',        // DNS temporary failure
  'EPIPE',            // Broken pipe - client disconnected
  'EHOSTUNREACH',     // Host unreachable
  'ENETUNREACH',      // Network unreachable
  'socket hang up',   // HTTP socket closed unexpectedly
  'Client network socket disconnected',
  'connect ETIMEDOUT',
  'read ECONNRESET',
  'write EPIPE',
  'NEXT_REDIRECT',    // Next.js redirect (not an actual error)
  'NEXT_NOT_FOUND',   // Next.js 404 (not an actual error)
];

// Critical errors that SHOULD trigger a restart
const CRITICAL_ERROR_PATTERNS = [
  'out of memory',
  'heap out of memory',
  'JavaScript heap',
  'FATAL ERROR',
  'Segmentation fault',
  'SIGKILL',
  'Cannot find module',
  'SyntaxError',
];

function isRecoverableError(error: Error): boolean {
  const message = error.message || '';
  const code = (error as NodeJS.ErrnoException).code || '';
  
  // Check if error matches recoverable patterns
  return RECOVERABLE_ERROR_PATTERNS.some(pattern => 
    message.includes(pattern) || code === pattern
  );
}

function isCriticalError(error: Error): boolean {
  const message = error.message || '';
  
  return CRITICAL_ERROR_PATTERNS.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Reset fatal error counter periodically when stable
    setInterval(() => {
      if (consecutiveFatalErrors > 0) {
        console.log(`[Server] Stability check: resetting fatal error counter (was ${consecutiveFatalErrors})`);
        consecutiveFatalErrors = 0;
      }
    }, FATAL_ERROR_RESET_INTERVAL).unref();

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      
      // Check if this is a recoverable error
      if (isRecoverableError(error)) {
        console.warn('[RECOVERABLE] Unhandled Promise Rejection (network/external):', {
          message: error.message,
          code: (error as NodeJS.ErrnoException).code,
          timestamp: new Date().toISOString(),
        });
        // Don't crash - just log and continue
        return;
      }
      
      console.error('[CRITICAL] Unhandled Promise Rejection:', {
        reason: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : reason,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error, origin) => {
      // Check if this is a recoverable network error
      if (isRecoverableError(error)) {
        console.warn('[RECOVERABLE] Uncaught Exception (network/external) - NOT crashing:', {
          message: error.message,
          code: (error as NodeJS.ErrnoException).code,
          origin,
          timestamp: new Date().toISOString(),
        });
        // Don't crash - just log and continue
        return;
      }
      
      console.error('[CRITICAL] Uncaught Exception:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        origin,
        timestamp: new Date().toISOString(),
      });
      
      // Check if this is a critical error that needs immediate restart
      if (isCriticalError(error)) {
        console.error('[FATAL] Critical system error detected, restarting immediately...');
        setTimeout(() => process.exit(1), 500);
        return;
      }
      
      // Track consecutive fatal errors to prevent restart loops
      consecutiveFatalErrors++;
      
      if (consecutiveFatalErrors >= MAX_FATAL_ERRORS_BEFORE_EXIT) {
        console.error(`[FATAL] Too many consecutive errors (${consecutiveFatalErrors}), forcing restart...`);
        setTimeout(() => process.exit(1), 1000);
        return;
      }
      
      // For non-critical, non-recoverable errors, log but try to continue
      // The process state may be undefined, but let's try to keep serving
      console.warn(`[WARNING] Non-critical uncaught exception (${consecutiveFatalErrors}/${MAX_FATAL_ERRORS_BEFORE_EXIT}), attempting to continue...`);
    });

    // Handle warnings (like deprecation warnings)
    process.on('warning', (warning) => {
      // Ignore noisy warnings that don't affect functionality
      if (warning.message?.includes('baseline-browser-mapping')) {
        return; // Ignore this npm package warning
      }
      console.warn('[WARNING]', warning.name, warning.message);
    });

    console.log('[Server] Global error handlers initialized');
    console.log('[Server] Node.js version:', process.version);
    console.log('[Server] Environment:', process.env.NODE_ENV);
  }
}
