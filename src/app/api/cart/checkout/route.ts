import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { shippingName, shippingEmail, shippingAddress, shippingCity, shippingZip, shippingCountry, notes } = body;

    // Validate required fields
    if (!shippingName || !shippingEmail || !shippingAddress || !shippingCity || !shippingZip || !shippingCountry) {
      return NextResponse.json({ error: 'All shipping fields are required' }, { status: 400 });
    }

    // Get user's cart with items
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            pull: {
              include: {
                card: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Calculate total
    const totalCoins = cart.items.reduce((sum, item) => {
      return sum + (item.pull.card ? Number(item.pull.card.coinValue) : 0);
    }, 0);

    // Create order with items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          totalCoins: totalCoins,
          shippingName,
          shippingEmail,
          shippingAddress,
          shippingCity,
          shippingZip,
          shippingCountry,
          notes: notes || null,
          items: {
            create: cart.items.map((item) => ({
              cardName: item.pull.card?.name || 'Unknown Card',
              cardImage: item.pull.card?.imageUrlGatherer || null,
              coinValue: item.pull.card ? Number(item.pull.card.coinValue) : 0,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Delete the pulls (cards are being shipped, so remove from user's collection)
      const pullIds = cart.items.map((item) => item.pull.id);
      await tx.pull.deleteMany({
        where: { id: { in: pullIds } },
      });

      // Clear the cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return newOrder;
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        totalCoins: order.totalCoins,
        itemCount: order.items.length,
        status: order.status,
      },
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Failed to process checkout' }, { status: 500 });
  }
}











