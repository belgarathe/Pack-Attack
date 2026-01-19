import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT - Update order status
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
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

    const order = await prisma.shopOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check ownership (shop owner or admin)
    if (user.role !== 'ADMIN' && (!user.shop || user.shop.id !== order.shopId)) {
      return NextResponse.json({ error: 'You can only manage orders for your shop' }, { status: 403 });
    }

    const { status, trackingNumber, trackingUrl } = await request.json();

    const updateData: any = {};
    if (status) updateData.status = status;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (trackingUrl !== undefined) updateData.trackingUrl = trackingUrl;
    if (status === 'PAID') updateData.paidAt = new Date();

    const updated = await prisma.shopOrder.update({
      where: { id: orderId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      order: {
        ...updated,
        subtotal: Number(updated.subtotal),
        shippingCost: Number(updated.shippingCost),
        total: Number(updated.total),
        items: updated.items.map(item => ({
          ...item,
          price: Number(item.price),
        })),
      },
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
