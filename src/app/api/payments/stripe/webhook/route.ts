import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { constructWebhookEvent } from '@/lib/stripe';
import Stripe from 'stripe';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    if (!STRIPE_WEBHOOK_SECRET) {
      console.error('Stripe webhook secret not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 503 }
      );
    }

    // Verify and construct the event
    let event: Stripe.Event;
    try {
      event = constructWebhookEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log('Stripe webhook event:', event.type);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Get metadata
        const userId = session.metadata?.userId;
        const coins = parseInt(session.metadata?.coins || '0');

        if (!userId || !coins) {
          console.error('Missing metadata in checkout session');
          break;
        }

        // Find the transaction
        const transaction = await prisma.transaction.findUnique({
          where: { stripePaymentId: session.id },
        });

        if (!transaction) {
          console.error('Transaction not found for session:', session.id);
          break;
        }

        // Skip if already completed
        if (transaction.status === 'COMPLETED') {
          console.log('Transaction already completed:', session.id);
          break;
        }

        // Update user coins and transaction status
        await prisma.$transaction([
          prisma.user.update({
            where: { id: userId },
            data: { coins: { increment: coins } },
          }),
          prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: 'COMPLETED' },
          }),
        ]);

        console.log(`Payment completed: ${coins} coins added to user ${userId}`);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Mark transaction as failed
        await prisma.transaction.updateMany({
          where: { 
            stripePaymentId: session.id,
            status: 'PENDING',
          },
          data: { status: 'FAILED' },
        });
        
        console.log('Checkout session expired:', session.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', paymentIntent.id);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}









