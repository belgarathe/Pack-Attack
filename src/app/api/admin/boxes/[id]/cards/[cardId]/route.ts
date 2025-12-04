import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Delete a card from a box
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: boxId, cardId } = await params;

    // Verify box exists
    const box = await prisma.box.findUnique({
      where: { id: boxId },
    });

    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    // Verify card exists and belongs to this box
    const card = await prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    if (card.boxId !== boxId) {
      return NextResponse.json({ error: 'Card does not belong to this box' }, { status: 400 });
    }

    // Delete the card (cascade will handle related pulls)
    await prisma.card.delete({
      where: { id: cardId },
    });

    // Update box image if needed (set to highest value card)
    const remainingCards = await prisma.card.findMany({
      where: { boxId },
      orderBy: { coinValue: 'desc' },
      take: 1,
    });

    if (remainingCards.length > 0 && remainingCards[0].imageUrlGatherer) {
      await prisma.box.update({
        where: { id: boxId },
        data: { imageUrl: remainingCards[0].imageUrlGatherer },
      });
    }

    return NextResponse.json({ success: true, message: 'Card removed from box' });
  } catch (error) {
    console.error('Error removing card from box:', error);
    return NextResponse.json({ error: 'Failed to remove card' }, { status: 500 });
  }
}

