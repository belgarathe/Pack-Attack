import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createCheckoutSession, getPackageByPrice, isStripeConfigured } from '@/lib/stripe';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const createCheckoutSchema = z.object({
  price: z.number().min(5).max(500),
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting - 3 payment attempts per minute
    const rateLimitResult = await rateLimit(request, 'payment');
    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 503 }
      );
    }

    // Check authentication
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { price } = createCheckoutSchema.parse(body);

    // Get coin package
    const coinPackage = getPackageByPrice(price);
    if (!coinPackage) {
      return NextResponse.json(
        { error: 'Invalid price' },
        { status: 400 }
      );
    }

    // Get base URL
    const baseUrl = process.env.NEXTAUTH_URL || 'https://pack-attack.de';

    // Create Stripe checkout session
    const checkoutSession = await createCheckoutSession(
      user.id,
      user.email,
      coinPackage.amount,
      coinPackage.priceInCents,
      `${baseUrl}/purchase-coins?success=true&session_id={CHECKOUT_SESSION_ID}`,
      `${baseUrl}/purchase-coins?cancelled=true`
    );

    // Create pending transaction
    await prisma.transaction.create({
      data: {
        userId: user.id,
        amount: price,
        coins: coinPackage.amount,
        stripePaymentId: checkoutSession.id,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating Stripe checkout:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}


