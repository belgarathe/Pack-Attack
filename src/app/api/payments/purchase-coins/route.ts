import { NextRequest, NextResponse } from 'next/server';

/**
 * SECURITY: This route has been disabled.
 * 
 * Previously, this route allowed direct coin addition without payment verification,
 * which was a critical security vulnerability that could be exploited for free coins.
 * 
 * For coin purchases, users should use the proper payment flows:
 * - Stripe: /api/payments/stripe/create-checkout
 * - PayPal: /api/payments/paypal/create-order
 * 
 * These payment routes properly verify payment before adding coins.
 */

export async function POST(request: NextRequest) {
  // SECURITY: Route disabled - use Stripe or PayPal payment flows instead
  console.warn('[SECURITY] Blocked attempt to use deprecated purchase-coins route');
  
  return NextResponse.json(
    { 
      error: 'This payment method is no longer available. Please use Stripe or PayPal checkout.',
      redirectTo: '/purchase-coins' 
    }, 
    { status: 410 } // 410 Gone - resource no longer available
  );
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' }, 
    { status: 405 }
  );
}

