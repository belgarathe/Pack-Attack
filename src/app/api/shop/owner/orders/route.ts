import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get orders for shop owner's shop
export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { shop: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.shop) {
      return NextResponse.json({ error: 'You do not have a shop' }, { status: 404 });
    }

    const orders = await prisma.shopOrder.findMany({
      where: { shopId: user.shop.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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
