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
        upsellItems: {
          include: {
            upsellItem: true,
          },
        },
      },
    });

    if (!cart || (cart.items.length === 0 && cart.upsellItems.length === 0)) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Calculate total
    const totalCoins = cart.items.reduce((sum, item) => {
      return sum + (item.pull.card ? Number(item.pull.card.coinValue) : 0);
    }, 0);

    // Calculate upsell coin cost
    const upsellCoinCost = cart.upsellItems
      .filter(ui => ui.payWithCoins)
      .reduce((sum, ui) => sum + Number(ui.upsellItem.coinPrice) * ui.quantity, 0);

    // Build upsell items note if any
    const upsellNote = cart.upsellItems.length > 0
      ? '\n--- Add-on Items ---\n' + cart.upsellItems.map(ui =>
          ui.payWithCoins
            ? `${ui.upsellItem.name} x${ui.quantity} @ ${Number(ui.upsellItem.coinPrice).toFixed(2)} coins`
            : `${ui.upsellItem.name} x${ui.quantity} @ ${Number(ui.upsellItem.price).toFixed(2)}€`
        ).join('\n')
      : '';

    const combinedNotes = ((notes || '') + upsellNote).trim() || null;

    // Separate items: shop items have either a card-level shopId or a box-level createdByShopId
    const shopBoxItems = cart.items.filter(item => item.pull.card?.shopId || item.pull.box?.createdByShopId);
    const regularItems = cart.items.filter(item => !item.pull.card?.shopId && !item.pull.box?.createdByShopId);

    // Check if user has enough coins for shipping + upsell coin items
    if (shippingMethod === 'COINS' || upsellCoinCost > 0) {
      const totalCoinCost = (shippingMethod === 'COINS' ? SHIPPING_COST_COINS : 0) + upsellCoinCost;
      const userCoins = Number(user.coins);
      if (userCoins < totalCoinCost) {
        return NextResponse.json({
          error: `Insufficient coins. Need ${totalCoinCost.toFixed(2)} coins, have ${userCoins.toFixed(2)}`
        }, { status: 400 });
      }
    }

    // Create orders in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct coins for shipping + upsell items paid with coins
      const totalCoinDeduction = (shippingMethod === 'COINS' ? SHIPPING_COST_COINS : 0) + upsellCoinCost;
      if (totalCoinDeduction > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: { coins: { decrement: new Decimal(totalCoinDeduction) } },
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
            notes: combinedNotes,
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
      // Card-level shopId takes priority over box-level createdByShopId
      for (const item of shopBoxItems) {
        const resolvedShopId = item.pull.card?.shopId || item.pull.box?.createdByShopId;
        if (!resolvedShopId) continue;

        const shopOrder = await tx.shopBoxOrder.create({
          data: {
            shopId: resolvedShopId,
            boxId: item.pull.box!.id,
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
            notes: combinedNotes,
            status: 'PENDING',
          },
        });
        shopOrders.push(shopOrder);
      }

      // Delete the pulls (cards are being shipped, so remove from user's collection)
      if (cart.items.length > 0) {
        const pullIds = cart.items.map((item) => item.pull.id);
        await tx.pull.deleteMany({
          where: { id: { in: pullIds } },
        });
      }

      // Clear the cart (items + upsell items)
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
      await tx.cartUpsellItem.deleteMany({
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
      coinsDeducted: (shippingMethod === 'COINS' ? SHIPPING_COST_COINS : 0) + upsellCoinCost,
      newBalance: updatedUser ? Number(updatedUser.coins) : null,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Failed to process checkout' }, { status: 500 });
  }
}











