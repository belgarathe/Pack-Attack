import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - List orders for shop boxes
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { shop: true },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SHOP_OWNER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let whereClause: any = {};
    
    // Filter by shop if not admin
    if (user.role === 'SHOP_OWNER' && user.shop) {
      whereClause.shopId = user.shop.id;
    } else if (user.role === 'SHOP_OWNER' && !user.shop) {
      return NextResponse.json({ success: true, orders: [] });
    }

    // Filter by status if provided
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const orders = await prisma.shopBoxOrder.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
        box: {
          select: { id: true, name: true, imageUrl: true },
        },
        shop: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Convert Decimal fields for JSON serialization
    const serializedOrders = orders.map(order => ({
      ...order,
      cardValue: Number(order.cardValue),
      shippingCost: Number(order.shippingCost),
    }));

    return NextResponse.json({ success: true, orders: serializedOrders });
  } catch (error) {
    console.error('Error fetching shop orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
