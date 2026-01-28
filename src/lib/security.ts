/**
 * Security utilities for Pack Attack
 * Implements state-of-the-art security best practices
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// ============================================================================
// CSRF Protection
// ============================================================================

const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = '__Host-csrf-token';

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Validate CSRF token from request
 */
export function validateCSRFToken(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  );
}

/**
 * Add CSRF cookie to response
 */
export function addCSRFCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

// ============================================================================
// Input Sanitization
// ============================================================================

/**
 * HTML entities to escape
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize user input - removes potentially dangerous characters
 * Use for plain text fields (names, descriptions, etc.)
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters (except newlines and tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize unicode
    .normalize('NFKC')
    // Trim whitespace
    .trim();
}

/**
 * Sanitize for SQL-like contexts (additional layer on top of Prisma's parameterization)
 */
export function sanitizeForDatabase(input: string): string {
  return sanitizeInput(input)
    // Remove SQL comment sequences
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '');
}

/**
 * Sanitize URL input
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: string): string {
  return sanitizeInput(email).toLowerCase();
}

// ============================================================================
// Password Security
// ============================================================================

/**
 * Password requirements for state-of-the-art security
 */
export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxLength: number;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxLength: 128,
};

/**
 * Validate password strength
 * Returns array of validation errors (empty if valid)
 */
export function validatePassword(password: string): string[] {
  const errors: string[] = [];
  const { minLength, maxLength, requireUppercase, requireLowercase, requireNumbers, requireSpecialChars } = PASSWORD_REQUIREMENTS;

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  if (password.length > maxLength) {
    errors.push(`Password must not exceed ${maxLength} characters`);
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?`~)');
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', 'qwerty', 'letmein', 'welcome',
    'admin', 'login', 'passw0rd', 'password1', 'password123',
  ];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push('Password contains a common weak pattern');
  }

  // Check for sequential characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password cannot contain more than 2 consecutive identical characters');
  }

  return errors;
}

/**
 * Check if password is strong enough (returns boolean)
 */
export function isPasswordStrong(password: string): boolean {
  return validatePassword(password).length === 0;
}

/**
 * Get password strength score (0-100)
 */
export function getPasswordStrength(password: string): number {
  let score = 0;

  // Length scoring
  score += Math.min(password.length * 4, 40);

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/\d/.test(password)) score += 10;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) score += 20;

  // Bonus for mixing character types
  const types = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
  ].filter(Boolean).length;

  if (types >= 3) score += 10;

  return Math.min(score, 100);
}

// ============================================================================
// Rate Limiting Helpers
// ============================================================================

/**
 * Generate a secure identifier for rate limiting
 * Combines IP + User-Agent for more accurate identification
 */
export function generateRateLimitKey(request: NextRequest, prefix: string = ''): string {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Hash the user agent for privacy
  const uaHash = crypto
    .createHash('sha256')
    .update(userAgent)
    .digest('hex')
    .substring(0, 8);

  return `${prefix}:${ip}:${uaHash}`;
}

/**
 * Get client IP address from request headers
 * Handles various proxy configurations
 */
export function getClientIP(request: NextRequest): string {
  // Check common proxy headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Get the first IP (original client)
    const ip = forwardedFor.split(',')[0].trim();
    if (isValidIP(ip)) return ip;
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP && isValidIP(realIP)) return realIP;

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP && isValidIP(cfConnectingIP)) return cfConnectingIP;

  // Fallback
  return 'unknown';
}

/**
 * Validate IP address format
 */
function isValidIP(ip: string): boolean {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === '::1';
}

// ============================================================================
// Authentication Security
// ============================================================================

/**
 * Timing-safe string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data (one-way)
 */
export function hashData(data: string): string {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}

// ============================================================================
// Request Validation
// ============================================================================

/**
 * Validate request origin for CORS-like protection
 */
export function validateOrigin(request: NextRequest, allowedOrigins: string[]): boolean {
  const origin = request.headers.get('origin');
  
  if (!origin) {
    // Allow same-origin requests (no origin header)
    return true;
  }

  return allowedOrigins.some(allowed => {
    if (allowed === '*') return true;
    if (allowed === origin) return true;
    // Support wildcard subdomains
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      return origin.endsWith(domain) || origin.endsWith('.' + domain);
    }
    return false;
  });
}

/**
 * Check if request is from a trusted source
 */
export function isTrustedRequest(request: NextRequest): boolean {
  const referer = request.headers.get('referer');
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // For same-origin requests
  if (!origin && !referer) return true;

  // Check if origin matches host
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host === host) return true;
    } catch {
      return false;
    }
  }

  return false;
}

// ============================================================================
// Logging Utilities (Security-aware)
// ============================================================================

/**
 * Sanitize data for logging - removes sensitive information
 */
export function sanitizeForLogging(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'password', 'passwordHash', 'token', 'secret', 'apiKey',
    'authorization', 'cookie', 'creditCard', 'ssn', 'pin',
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Safe error message for client responses
 * Never expose internal error details
 */
export function getSafeErrorMessage(error: unknown): string {
  // List of safe error messages that can be shown to users
  const safeMessages = [
    'Invalid credentials',
    'User not found',
    'Email already exists',
    'Invalid input',
    'Rate limit exceeded',
    'Unauthorized',
    'Forbidden',
    'Not found',
    'Session expired',
  ];

  if (error instanceof Error) {
    if (safeMessages.includes(error.message)) {
      return error.message;
    }
  }

  // Default generic message
  return 'An error occurred. Please try again later.';
}

// ============================================================================
// Security Constants
// ============================================================================

export const SECURITY_CONSTANTS = {
  // Session settings
  SESSION_MAX_AGE: 24 * 60 * 60, // 24 hours in seconds
  SESSION_UPDATE_AGE: 60 * 60, // Update session every hour

  // Rate limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes

  // Token settings
  VERIFICATION_TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET_TOKEN_EXPIRY: 60 * 60 * 1000, // 1 hour

  // Bcrypt rounds (12 is recommended for production)
  BCRYPT_ROUNDS: 12,

  // Request limits
  MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_JSON_SIZE: 1 * 1024 * 1024, // 1MB
} as const;
