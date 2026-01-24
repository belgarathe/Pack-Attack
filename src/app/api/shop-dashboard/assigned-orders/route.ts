import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch orders assigned to the shop owner
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

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SHOP_OWNER')) {
      return NextResponse.json({ error: 'Shop owner access required' }, { status: 403 });
    }

    // For admins, show all assigned orders. For shop owners, show only their orders.
    const isAdmin = user.role === 'ADMIN';
    const shop = user.shop;

    if (!isAdmin && !shop) {
      return NextResponse.json({ error: 'No shop associated with this account' }, { status: 403 });
    }

    const whereClause = isAdmin
      ? { assignedShopId: { not: null } }
      : { assignedShopId: shop!.id };

    const orders = await prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        items: true,
        assignedShop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate stats
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'PENDING').length,
      processing: orders.filter(o => o.status === 'PROCESSING').length,
      shipped: orders.filter(o => o.status === 'SHIPPED').length,
      delivered: orders.filter(o => o.status === 'DELIVERED').length,
    };

    return NextResponse.json({ 
      success: true, 
      orders: orders.map(o => ({
        ...o,
        totalCoins: Number(o.totalCoins),
        shippingCost: Number(o.shippingCost),
        items: o.items.map(item => ({
          ...item,
          coinValue: Number(item.coinValue),
        })),
      })),
      stats,
    });
  } catch (error) {
    console.error('Error fetching assigned orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
