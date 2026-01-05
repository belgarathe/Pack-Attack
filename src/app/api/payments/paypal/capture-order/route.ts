import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { capturePayPalOrder, isPayPalConfigured } from '@/lib/paypal';
import { z } from 'zod';

const captureOrderSchema = z.object({
  orderId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    // Check if PayPal is configured
    if (!isPayPalConfigured()) {
      return NextResponse.json(
        { error: 'PayPal is not configured' },
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
    const { orderId } = captureOrderSchema.parse(body);

    // Find the pending transaction
    const transaction = await prisma.transaction.findUnique({
      where: { paypalOrderId: orderId },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Verify transaction belongs to this user
    if (transaction.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if already completed
    if (transaction.status === 'COMPLETED') {
      return NextResponse.json({
        success: true,
        message: 'Payment already processed',
        coinsAdded: transaction.coins,
        newBalance: user.coins,
      });
    }

    // Capture the PayPal order
    const captureResult = await capturePayPalOrder(orderId);

    if (captureResult.status !== 'COMPLETED') {
      // Update transaction status to failed
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED' },
      });

      return NextResponse.json(
        { error: 'Payment was not completed' },
        { status: 400 }
      );
    }

    // Get payer ID if available
    const payerId = captureResult.payer?.payer_id;

    // Update user's coin balance and transaction status atomically
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { coins: { increment: transaction.coins } },
      }),
      prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'COMPLETED',
          paypalPayerId: payerId,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      coinsAdded: transaction.coins,
      newBalance: updatedUser.coins,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error capturing PayPal order:', error);
    return NextResponse.json(
      { error: 'Failed to capture payment' },
      { status: 500 }
    );
  }
}


