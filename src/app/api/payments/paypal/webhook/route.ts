import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature, getPayPalOrder } from '@/lib/paypal';

const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || '';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headers: Record<string, string> = {};
    
    // Extract PayPal headers
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // Verify webhook signature in production
    if (process.env.NODE_ENV === 'production' && PAYPAL_WEBHOOK_ID) {
      const isValid = await verifyWebhookSignature(PAYPAL_WEBHOOK_ID, headers, body);
      if (!isValid) {
        console.error('Invalid PayPal webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    const event = JSON.parse(body);
    const eventType = event.event_type;

    console.log('PayPal webhook event:', eventType);

    switch (eventType) {
      case 'CHECKOUT.ORDER.APPROVED':
        // Order was approved by customer - we'll capture in the frontend
        console.log('Order approved:', event.resource.id);
        break;

      case 'PAYMENT.CAPTURE.COMPLETED':
        // Payment was captured successfully
        const captureId = event.resource.id;
        const orderId = event.resource.supplementary_data?.related_ids?.order_id;
        
        if (orderId) {
          // Find transaction by PayPal order ID
          const transaction = await prisma.transaction.findUnique({
            where: { paypalOrderId: orderId },
          });

          if (transaction && transaction.status !== 'COMPLETED') {
            // Update transaction and user balance
            await prisma.$transaction([
              prisma.user.update({
                where: { id: transaction.userId },
                data: { coins: { increment: transaction.coins } },
              }),
              prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 'COMPLETED' },
              }),
            ]);
            
            console.log(`Payment completed for order ${orderId}, added ${transaction.coins} coins`);
          }
        }
        break;

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.REFUNDED':
        // Handle denied or refunded payments
        const failedOrderId = event.resource.supplementary_data?.related_ids?.order_id;
        
        if (failedOrderId) {
          await prisma.transaction.updateMany({
            where: { 
              paypalOrderId: failedOrderId,
              status: 'PENDING',
            },
            data: { 
              status: eventType === 'PAYMENT.CAPTURE.REFUNDED' ? 'REFUNDED' : 'FAILED' 
            },
          });
        }
        break;

      default:
        console.log('Unhandled PayPal event type:', eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing PayPal webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}







