import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch single assigned order
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
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

    const { orderId } = await params;
    const isAdmin = user.role === 'ADMIN';
    const shop = user.shop;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
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

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify shop owner can access this order
    if (!isAdmin && order.assignedShopId !== shop?.id) {
      return NextResponse.json({ error: 'Order not assigned to your shop' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        totalCoins: Number(order.totalCoins),
        shippingCost: Number(order.shippingCost),
        items: order.items.map(item => ({
          ...item,
          coinValue: Number(item.coinValue),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

// PATCH - Update assigned order (status, tracking, notes)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
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

    const { orderId } = await params;
    const body = await request.json();
    const { status, trackingNumber, trackingUrl, shopNotes } = body;

    const isAdmin = user.role === 'ADMIN';
    const shop = user.shop;

    // First fetch the order to verify ownership
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify shop owner can update this order
    if (!isAdmin && existingOrder.assignedShopId !== shop?.id) {
      return NextResponse.json({ error: 'Order not assigned to your shop' }, { status: 403 });
    }

    // Build update data
    const updateData: any = {};

    // Handle status update
    if (status) {
      const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = status;
    }

    // Handle tracking info
    if (trackingNumber !== undefined) {
      updateData.trackingNumber = trackingNumber || null;
    }
    if (trackingUrl !== undefined) {
      updateData.trackingUrl = trackingUrl || null;
    }
    if (shopNotes !== undefined) {
      updateData.shopNotes = shopNotes || null;
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
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

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        totalCoins: Number(order.totalCoins),
        shippingCost: Number(order.shippingCost),
        items: order.items.map(item => ({
          ...item,
          coinValue: Number(item.coinValue),
        })),
      },
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
