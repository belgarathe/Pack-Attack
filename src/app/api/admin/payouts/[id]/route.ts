import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, adminNotes } = body;

    const payout = await prisma.shopPayout.findUnique({
      where: { id },
      include: { shop: true },
    });

    if (!payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    if (status === 'PROCESSING') {
      if (payout.status !== 'REQUESTED') {
        return NextResponse.json({ error: 'Can only process requested payouts' }, { status: 400 });
      }
      updateData.status = 'PROCESSING';
      updateData.processedById = admin.id;
    } else if (status === 'COMPLETED') {
      if (payout.status !== 'PROCESSING' && payout.status !== 'REQUESTED') {
        return NextResponse.json({ error: 'Can only complete requested/processing payouts' }, { status: 400 });
      }

      const currentShop = await prisma.shop.findUnique({
        where: { id: payout.shopId },
        select: { coinBalance: true },
      });

      if (Number(currentShop?.coinBalance || 0) < Number(payout.coinAmount)) {
        return NextResponse.json({ error: 'Shop does not have enough coins for this payout' }, { status: 400 });
      }

      // Deduct coins from shop wallet and mark payout complete in a transaction
      await prisma.$transaction([
        prisma.shop.update({
          where: { id: payout.shopId },
          data: { coinBalance: { decrement: payout.coinAmount } },
        }),
        prisma.shopPayout.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            processedById: admin.id,
            processedAt: new Date(),
            ...( adminNotes !== undefined ? { adminNotes } : {}),
          },
        }),
      ]);

      const updated = await prisma.shopPayout.findUnique({
        where: { id },
        include: {
          shop: {
            select: {
              id: true, name: true, taxId: true, coinBalance: true,
              owner: { select: { id: true, email: true, name: true } },
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        payout: {
          ...updated,
          coinAmount: Number(updated!.coinAmount),
          euroAmount: Number(updated!.euroAmount),
          shop: { ...updated!.shop, coinBalance: Number(updated!.shop.coinBalance) },
        },
      });
    } else if (status === 'REJECTED') {
      if (payout.status === 'COMPLETED') {
        return NextResponse.json({ error: 'Cannot reject a completed payout' }, { status: 400 });
      }
      updateData.status = 'REJECTED';
      updateData.processedById = admin.id;
      updateData.processedAt = new Date();
    }

    if (Object.keys(updateData).length > 0 && status !== 'COMPLETED') {
      const updated = await prisma.shopPayout.update({
        where: { id },
        data: updateData,
        include: {
          shop: {
            select: {
              id: true, name: true, taxId: true, coinBalance: true,
              owner: { select: { id: true, email: true, name: true } },
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        payout: {
          ...updated,
          coinAmount: Number(updated.coinAmount),
          euroAmount: Number(updated.euroAmount),
          shop: { ...updated.shop, coinBalance: Number(updated.shop.coinBalance) },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating payout:', error);
    return NextResponse.json({ error: 'Failed to update payout' }, { status: 500 });
  }
}
