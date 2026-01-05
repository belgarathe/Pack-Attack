import { NextResponse } from 'next/server';
import { getPayPalClientId, getPayPalMode, isPayPalConfigured } from '@/lib/paypal';

export async function GET() {
  try {
    if (!isPayPalConfigured()) {
      return NextResponse.json(
        { error: 'PayPal is not configured' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      clientId: getPayPalClientId(),
      mode: getPayPalMode(),
    });
  } catch (error) {
    console.error('Error getting PayPal config:', error);
    return NextResponse.json(
      { error: 'Failed to get PayPal configuration' },
      { status: 500 }
    );
  }
}


