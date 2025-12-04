/**
 * Production-ready logging utility
 * Replaces console.log statements with environment-aware logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  context?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private context: string;

  constructor(context?: string) {
    this.context = context || 'App';
  }

  private formatMessage(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context: this.context,
    };
  }

  private output(entry: LogEntry) {
    // In production, you would send these to a logging service
    // like Sentry, LogRocket, or CloudWatch
    if (this.isDevelopment) {
      const { level, message, data, context } = entry;
      const prefix = `[${context}]`;
      
      switch (level) {
        case 'debug':
          if (this.isDevelopment) {
            console.debug(prefix, message, data || '');
          }
          break;
        case 'info':
          console.info(prefix, message, data || '');
          break;
        case 'warn':
          console.warn(prefix, message, data || '');
          break;
        case 'error':
          console.error(prefix, message, data || '');
          break;
      }
    } else {
      // In production, only log warnings and errors
      if (entry.level === 'warn' || entry.level === 'error') {
        // Send to external logging service
        this.sendToLoggingService(entry);
      }
    }
  }

  private sendToLoggingService(entry: LogEntry) {
    // Implement integration with your logging service
    // Example: Sentry, LogRocket, etc.
    
    // For now, just use console in production for errors
    if (entry.level === 'error') {
      console.error(`[${entry.context}] ${entry.message}`, entry.data);
    }
  }

  debug(message: string, data?: any) {
    const entry = this.formatMessage('debug', message, data);
    this.output(entry);
  }

  info(message: string, data?: any) {
    const entry = this.formatMessage('info', message, data);
    this.output(entry);
  }

  warn(message: string, data?: any) {
    const entry = this.formatMessage('warn', message, data);
    this.output(entry);
  }

  error(message: string, data?: any) {
    const entry = this.formatMessage('error', message, data);
    this.output(entry);
    
    // In production, you might want to notify administrators
    if (!this.isDevelopment && data instanceof Error) {
      // Send error notification
      this.notifyError(data);
    }
  }

  private notifyError(error: Error) {
    // Implement error notification
    // Could send email, Slack message, etc.
  }
}

// Export factory function for creating logger instances
export function createLogger(context?: string): Logger {
  return new Logger(context);
}

// Export default logger instance
export const logger = new Logger('App');
