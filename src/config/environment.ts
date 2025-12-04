/**
 * Environment configuration with validation
 * Ensures all required environment variables are present
 */

export const config = {
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Database
  database: {
    url: process.env.DATABASE_URL || '',
  },
  
  // Authentication
  auth: {
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    secret: process.env.NEXTAUTH_SECRET || '',
  },
  
  // Application
  app: {
    name: 'Pack Attack',
    description: 'Magic: The Gathering Box Battles',
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },
  
  // Optional Services (add as needed)
  services: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
    email: {
      host: process.env.EMAIL_SERVER_HOST || '',
      port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
      user: process.env.EMAIL_SERVER_USER || '',
      password: process.env.EMAIL_SERVER_PASSWORD || '',
      from: process.env.EMAIL_FROM || 'noreply@packattack.com',
    },
    analytics: {
      googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID || '',
      vercelAnalyticsId: process.env.VERCEL_ANALYTICS_ID || '',
    },
    sentry: {
      dsn: process.env.SENTRY_DSN || '',
      environment: process.env.NODE_ENV || 'development',
    },
  },
};

/**
 * Validate required environment variables
 * Call this at application startup
 */
export function validateEnvironment(): void {
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
  
  // Validate NEXTAUTH_SECRET length in production
  if (config.isProduction && config.auth.secret.length < 32) {
    throw new Error(
      'NEXTAUTH_SECRET must be at least 32 characters in production.\n' +
      'Generate a secure secret with: openssl rand -base64 32'
    );
  }
  
  // Warn about development settings in production
  if (config.isProduction) {
    if (config.auth.url.includes('localhost')) {
      console.warn('Warning: NEXTAUTH_URL is set to localhost in production!');
    }
  }
}

// Auto-validate in development
if (config.isDevelopment) {
  try {
    validateEnvironment();
  } catch (error) {
    console.error('Environment validation failed:', error);
  }
}
