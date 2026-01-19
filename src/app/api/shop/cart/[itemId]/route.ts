import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT - Update cart item quantity
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
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

    const { quantity } = await request.json();

    if (quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 });
    }

    const cartItem = await prisma.shopCartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        product: true,
      },
    });

    if (!cartItem || cartItem.cart.userId !== user.id) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    if (cartItem.product.stock < quantity) {
      return NextResponse.json({ error: `Only ${cartItem.product.stock} items in stock` }, { status: 400 });
    }

    await prisma.shopCartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return NextResponse.json({ success: true, message: 'Quantity updated' });
  } catch (error) {
    console.error('Error updating cart item:', error);
    return NextResponse.json({ error: 'Failed to update cart item' }, { status: 500 });
  }
}

// DELETE - Remove item from cart
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
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

    const cartItem = await prisma.shopCartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!cartItem || cartItem.cart.userId !== user.id) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    await prisma.shopCartItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error removing cart item:', error);
    return NextResponse.json({ error: 'Failed to remove cart item' }, { status: 500 });
  }
}
