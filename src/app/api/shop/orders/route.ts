import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

// GET user's orders
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

    const orders = await prisma.shopOrder.findMany({
      where: { userId: user.id },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                images: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const serializedOrders = orders.map(order => ({
      ...order,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      total: Number(order.total),
      items: order.items.map(item => ({
        ...item,
        price: Number(item.price),
      })),
    }));

    return NextResponse.json({ success: true, orders: serializedOrders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

// POST - Create order from cart
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
    const { shippingName, shippingEmail, shippingAddress, shippingCity, shippingZip, shippingCountry, shippingPhone, notes, paymentMethod } = body;

    if (!shippingName || !shippingEmail || !shippingAddress || !shippingCity || !shippingZip || !shippingCountry) {
      return NextResponse.json({ error: 'Shipping information is required' }, { status: 400 });
    }

    // Get cart with items
    const cart = await prisma.shopCart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                shop: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Group items by shop
    const itemsByShop = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      const shopId = item.product.shopId;
      if (!itemsByShop.has(shopId)) {
        itemsByShop.set(shopId, []);
      }
      itemsByShop.get(shopId)!.push(item);
    }

    // Verify stock for all items
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return NextResponse.json({
          error: `Not enough stock for ${item.product.name}. Available: ${item.product.stock}`,
        }, { status: 400 });
      }
    }

    // Create orders (one per shop) in a transaction
    const orders = await prisma.$transaction(async (tx) => {
      const createdOrders = [];

      for (const [shopId, items] of itemsByShop) {
        const subtotal = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
        const shippingCost = 5.00; // Fixed shipping per shop
        const total = subtotal + shippingCost;

        // Create order
        const order = await tx.shopOrder.create({
          data: {
            userId: user.id,
            shopId,
            subtotal: new Decimal(subtotal),
            shippingCost: new Decimal(shippingCost),
            total: new Decimal(total),
            shippingName,
            shippingEmail,
            shippingAddress,
            shippingCity,
            shippingZip,
            shippingCountry,
            shippingPhone: shippingPhone || null,
            notes: notes || null,
            paymentMethod: paymentMethod || 'PENDING',
            items: {
              create: items.map(item => ({
                productId: item.productId,
                productName: item.product.name,
                productImage: item.product.images[0] || null,
                price: item.product.price,
                quantity: item.quantity,
              })),
            },
          },
          include: {
            shop: {
              select: { id: true, name: true },
            },
            items: true,
          },
        });

        // Decrease stock
        for (const item of items) {
          await tx.shopProduct.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }

        createdOrders.push(order);
      }

      // Clear cart
      await tx.shopCartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return createdOrders;
    });

    const serializedOrders = orders.map(order => ({
      ...order,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      total: Number(order.total),
      items: order.items.map(item => ({
        ...item,
        price: Number(item.price),
      })),
    }));

    return NextResponse.json({
      success: true,
      message: `Created ${orders.length} order${orders.length > 1 ? 's' : ''}`,
      orders: serializedOrders,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
