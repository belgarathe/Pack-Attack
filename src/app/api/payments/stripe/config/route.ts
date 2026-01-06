import { NextResponse } from 'next/server';
import { getStripePublishableKey, isStripeConfigured } from '@/lib/stripe';

export async function GET() {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      publishableKey: getStripePublishableKey(),
    });
  } catch (error) {
    console.error('Error getting Stripe config:', error);
    return NextResponse.json(
      { error: 'Failed to get Stripe configuration' },
      { status: 500 }
    );
  }
}







