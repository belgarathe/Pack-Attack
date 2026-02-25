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

    const { upsellItemId, action = 'add', payWithCoins } = await request.json();

    if (!upsellItemId) {
      return NextResponse.json({ error: 'upsellItemId is required' }, { status: 400 });
    }

    const upsellItem = await prisma.upsellItem.findUnique({
      where: { id: upsellItemId },
    });

    if (!upsellItem || !upsellItem.isActive) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    let cart = await prisma.cart.findUnique({
      where: { userId: user.id },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: user.id },
      });
    }

    if (action === 'togglePayment') {
      const existing = await prisma.cartUpsellItem.findUnique({
        where: { cartId_upsellItemId: { cartId: cart.id, upsellItemId } },
      });

      if (existing) {
        await prisma.cartUpsellItem.update({
          where: { id: existing.id },
          data: { payWithCoins: !!payWithCoins },
        });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'remove') {
      await prisma.cartUpsellItem.deleteMany({
        where: { cartId: cart.id, upsellItemId },
      });

      return NextResponse.json({ success: true, message: 'Item removed from cart' });
    }

    if (action === 'increment') {
      const existing = await prisma.cartUpsellItem.findUnique({
        where: { cartId_upsellItemId: { cartId: cart.id, upsellItemId } },
      });

      if (existing) {
        await prisma.cartUpsellItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + 1 },
        });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'decrement') {
      const existing = await prisma.cartUpsellItem.findUnique({
        where: { cartId_upsellItemId: { cartId: cart.id, upsellItemId } },
      });

      if (existing && existing.quantity > 1) {
        await prisma.cartUpsellItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity - 1 },
        });
      } else if (existing) {
        await prisma.cartUpsellItem.delete({ where: { id: existing.id } });
      }

      return NextResponse.json({ success: true });
    }

    // Default: add
    const existing = await prisma.cartUpsellItem.findUnique({
      where: { cartId_upsellItemId: { cartId: cart.id, upsellItemId } },
    });

    if (existing) {
      await prisma.cartUpsellItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + 1 },
      });
    } else {
      await prisma.cartUpsellItem.create({
        data: { cartId: cart.id, upsellItemId, quantity: 1 },
      });
    }

    return NextResponse.json({ success: true, message: 'Item added to cart' });
  } catch (error) {
    console.error('Upsell cart error:', error);
    return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
  }
}
