/**
 * API utility functions for stability and error handling
 */

import { NextResponse } from 'next/server';

/**
 * Default timeout for API requests (30 seconds)
 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Wraps an async operation with a timeout
 * Prevents requests from hanging indefinitely
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  context?: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms${context ? ` (${context})` : ''}`));
    }, timeoutMs);
  });

  return Promise.race([operation(), timeoutPromise]);
}

/**
 * Standard error response format
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  code?: string;
  timestamp: string;
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  status: number = 500,
  defaultMessage: string = 'Internal server error'
): NextResponse<ApiErrorResponse> {
  const timestamp = new Date().toISOString();
  
  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('timed out')) {
      return NextResponse.json({
        error: 'Request timeout',
        message: 'The request took too long to process. Please try again.',
        code: 'TIMEOUT',
        timestamp,
      }, { status: 504 });
    }
    
    // Log the error for debugging
    console.error(`[API Error] ${timestamp}:`, {
      message: error.message,
      stack: error.stack,
    });
    
    return NextResponse.json({
      error: defaultMessage,
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp,
    }, { status });
  }
  
  return NextResponse.json({
    error: defaultMessage,
    timestamp,
  }, { status });
}

/**
 * Wraps an API handler with standard error handling and timeout
 */
export function withApiHandler<T>(
  handler: () => Promise<T>,
  options: {
    timeoutMs?: number;
    context?: string;
    defaultErrorMessage?: string;
  } = {}
): Promise<T | NextResponse<ApiErrorResponse>> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, context, defaultErrorMessage } = options;
  
  return withTimeout(handler, timeoutMs, context).catch((error) => {
    return createErrorResponse(error, 500, defaultErrorMessage);
  });
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Sleep utility for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
