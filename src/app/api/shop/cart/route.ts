import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET user's shop cart
export async function GET() {
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

    const cart = await prisma.shopCart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                shop: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cart) {
      return NextResponse.json({ success: true, cart: { items: [], total: 0 } });
    }

    const items = cart.items.map(item => ({
      ...item,
      product: {
        ...item.product,
        price: Number(item.product.price),
        comparePrice: item.product.comparePrice ? Number(item.product.comparePrice) : null,
      },
    }));

    const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    return NextResponse.json({
      success: true,
      cart: {
        id: cart.id,
        items,
        total,
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      },
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
  }
}

// POST - Add item to cart
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

    const { productId, quantity = 1 } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Check product exists and is available
    const product = await prisma.shopProduct.findUnique({
      where: { id: productId },
      include: { shop: true },
    });

    if (!product || !product.isActive || !product.shop.isActive) {
      return NextResponse.json({ error: 'Product not available' }, { status: 404 });
    }

    if (product.stock < quantity) {
      return NextResponse.json({ error: `Only ${product.stock} items in stock` }, { status: 400 });
    }

    // Get or create cart
    let cart = await prisma.shopCart.findUnique({
      where: { userId: user.id },
    });

    if (!cart) {
      cart = await prisma.shopCart.create({
        data: { userId: user.id },
      });
    }

    // Check if item already in cart
    const existingItem = await prisma.shopCartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (product.stock < newQuantity) {
        return NextResponse.json({ error: `Cannot add more. Only ${product.stock} items in stock` }, { status: 400 });
      }

      await prisma.shopCartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      await prisma.shopCartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
      });
    }

    // Get updated cart
    const updatedCart = await prisma.shopCart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                shop: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const items = updatedCart!.items.map(item => ({
      ...item,
      product: {
        ...item.product,
        price: Number(item.product.price),
        comparePrice: item.product.comparePrice ? Number(item.product.comparePrice) : null,
      },
    }));

    const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    return NextResponse.json({
      success: true,
      message: 'Added to cart',
      cart: {
        id: updatedCart!.id,
        items,
        total,
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      },
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
  }
}

// DELETE - Clear cart
export async function DELETE() {
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

    const cart = await prisma.shopCart.findUnique({
      where: { userId: user.id },
    });

    if (cart) {
      await prisma.shopCartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    return NextResponse.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    return NextResponse.json({ error: 'Failed to clear cart' }, { status: 500 });
  }
}
