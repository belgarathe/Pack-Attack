/**
 * Next.js Instrumentation file
 * This runs when the server starts and sets up global error handlers
 * to prevent crashes from unhandled errors
 */

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[CRITICAL] Unhandled Promise Rejection:', {
        reason: reason instanceof Error ? {
          message: reason.message,
          stack: reason.stack,
          name: reason.name,
        } : reason,
        timestamp: new Date().toISOString(),
      });
      
      // In production, you would send this to an error tracking service
      // like Sentry, LogRocket, etc.
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('[CRITICAL] Uncaught Exception:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        timestamp: new Date().toISOString(),
      });
      
      // In production, you would send this to an error tracking service
      // Note: After uncaughtException, the process state is undefined
      // It's recommended to exit and let PM2 restart the process
      
      // Give time for logs to flush, then exit
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    // Handle warnings (like deprecation warnings)
    process.on('warning', (warning) => {
      console.warn('[WARNING]', warning.name, warning.message);
    });

    console.log('[Server] Global error handlers initialized');
    console.log('[Server] Node.js version:', process.version);
    console.log('[Server] Environment:', process.env.NODE_ENV);
  }
}
