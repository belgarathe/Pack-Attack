import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { rateLimit } from '@/lib/rate-limit';

const SHIPPING_COST_COINS = 5.00;

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 checkout attempts per minute
    const rateLimitResult = await rateLimit(request, 'payment');
    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response;
    }

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
    const { 
      shippingName, 
      shippingEmail, 
      shippingAddress, 
      shippingCity, 
      shippingZip, 
      shippingCountry, 
      notes,
      shippingMethod = 'COINS',
      shippingCost = SHIPPING_COST_COINS,
    } = body;

    // Validate required fields
    if (!shippingName || !shippingEmail || !shippingAddress || !shippingCity || !shippingZip || !shippingCountry) {
      return NextResponse.json({ error: 'All shipping fields are required' }, { status: 400 });
    }

    // If paying with coins, check if user has enough
    if (shippingMethod === 'COINS') {
      const userCoins = Number(user.coins);
      if (userCoins < SHIPPING_COST_COINS) {
        return NextResponse.json({ 
          error: `Insufficient coins for shipping. Need ${SHIPPING_COST_COINS.toFixed(2)} coins, have ${userCoins.toFixed(2)}` 
        }, { status: 400 });
      }
    }

    // Get user's cart with items, including box info for shop orders
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            pull: {
              include: {
                card: true,
                box: {
                  select: {
                    id: true,
                    name: true,
                    createdByShopId: true,
                  },
                },
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

    // Separate items from shop-created boxes vs regular admin boxes
    const shopBoxItems = cart.items.filter(item => item.pull.box?.createdByShopId);
    const regularItems = cart.items.filter(item => !item.pull.box?.createdByShopId);

    // Create orders in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // If paying with coins, deduct shipping cost
      if (shippingMethod === 'COINS') {
        await tx.user.update({
          where: { id: user.id },
          data: { coins: { decrement: new Decimal(SHIPPING_COST_COINS) } },
        });
      }

      let newOrder = null;
      const shopOrders = [];

      // Create regular order for admin-created box items
      if (regularItems.length > 0) {
        const regularTotalCoins = regularItems.reduce((sum, item) => {
          return sum + (item.pull.card ? Number(item.pull.card.coinValue) : 0);
        }, 0);

        newOrder = await tx.order.create({
          data: {
            userId: user.id,
            totalCoins: regularTotalCoins,
            shippingName,
            shippingEmail,
            shippingAddress,
            shippingCity,
            shippingZip,
            shippingCountry,
            shippingMethod: shippingMethod as 'COINS' | 'EUROS',
            shippingCost: new Decimal(shippingCost),
            notes: notes || null,
            items: {
              create: regularItems.map((item) => ({
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
      }

      // Create individual shop box orders for each shop item
      // Each card from a shop box gets its own order to the shop
      for (const item of shopBoxItems) {
        if (!item.pull.box?.createdByShopId) continue;

        const shopOrder = await tx.shopBoxOrder.create({
          data: {
            shopId: item.pull.box.createdByShopId,
            boxId: item.pull.box.id,
            userId: user.id,
            cardName: item.pull.card?.name || 'Unknown Card',
            cardImage: item.pull.card?.imageUrlGatherer || null,
            cardValue: item.pull.card ? Number(item.pull.card.coinValue) : 0,
            cardRarity: item.pull.card?.rarity || null,
            shippingName,
            shippingEmail,
            shippingAddress,
            shippingCity,
            shippingZip,
            shippingCountry,
            shippingMethod: shippingMethod as 'COINS' | 'EUROS',
            shippingCost: new Decimal(shippingCost / Math.max(shopBoxItems.length, 1)), // Split shipping among shop orders
            notes: notes || null,
            status: 'PENDING',
          },
        });
        shopOrders.push(shopOrder);
      }

      // Delete the pulls (cards are being shipped, so remove from user's collection)
      const pullIds = cart.items.map((item) => item.pull.id);
      await tx.pull.deleteMany({
        where: { id: { in: pullIds } },
      });

      // Clear the cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return { order: newOrder, shopOrders };
    });

    const order = result.order;

    // Get updated user balance
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { coins: true },
    });

    return NextResponse.json({
      success: true,
      order: order ? {
        id: order.id,
        totalCoins: Number(order.totalCoins),
        itemCount: order.items.length,
        status: order.status,
        shippingMethod: order.shippingMethod,
        shippingCost: Number(order.shippingCost),
      } : null,
      shopOrders: result.shopOrders.length,
      totalItemCount: cart.items.length,
      coinsDeducted: shippingMethod === 'COINS' ? SHIPPING_COST_COINS : 0,
      newBalance: updatedUser ? Number(updatedUser.coins) : null,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Failed to process checkout' }, { status: 500 });
  }
}











