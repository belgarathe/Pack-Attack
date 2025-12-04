import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const updateCardSchema = z.object({
  pullRate: z.number().min(0.001).max(100).optional(),
  coinValue: z.number().int().min(1).optional(),
});

// PATCH /api/admin/boxes/[id]/cards/[cardId] - Update card values
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id?: string; cardId?: string }> }
) {
  try {
    const { id: boxId, cardId } = await context.params;
    const session = await getCurrentSession();

    // Check if user is admin
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (!boxId || !cardId) {
      return NextResponse.json({ error: 'Box ID and Card ID required' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateCardSchema.parse(body);

    // Check if card exists and belongs to the box
    const existingCard = await prisma.card.findFirst({
      where: {
        id: cardId,
        boxId: boxId,
      },
    });

    if (!existingCard) {
      return NextResponse.json({ error: 'Card not found in this box' }, { status: 404 });
    }

    // If updating pull rate, check total doesn't exceed 100%
    if (validatedData.pullRate !== undefined) {
      const otherCards = await prisma.card.findMany({
        where: {
          boxId: boxId,
          id: { not: cardId },
        },
      });

      const otherCardsTotal = otherCards.reduce((sum, card) => sum + Number(card.pullRate), 0);
      const newTotal = otherCardsTotal + validatedData.pullRate;

      if (newTotal > 100.01) { // Allow tiny floating point errors
        return NextResponse.json(
          { 
            error: `Total pull rate would exceed 100%. Current other cards: ${otherCardsTotal.toFixed(3)}%, New rate: ${validatedData.pullRate}%, Total would be: ${newTotal.toFixed(3)}%` 
          },
          { status: 400 }
        );
      }
    }

    // Update the card
    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        ...(validatedData.pullRate !== undefined && { pullRate: validatedData.pullRate }),
        ...(validatedData.coinValue !== undefined && { coinValue: validatedData.coinValue }),
      },
    });

    // Revalidate cache
    revalidatePath(`/admin/boxes/${boxId}/edit`);
    revalidatePath(`/admin/boxes`);
    revalidatePath(`/boxes`);

    return NextResponse.json({ 
      success: true, 
      card: updatedCard,
      message: 'Card updated successfully' 
    });
  } catch (error) {
    console.error('Error updating card:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update card' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/boxes/[id]/cards/[cardId] - Remove card from box
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id?: string; cardId?: string }> }
) {
  try {
    const { id: boxId, cardId } = await context.params;
    const session = await getCurrentSession();

    // Check if user is admin
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (!boxId || !cardId) {
      return NextResponse.json({ error: 'Box ID and Card ID required' }, { status: 400 });
    }

    // Check if card exists and belongs to the box
    const existingCard = await prisma.card.findFirst({
      where: {
        id: cardId,
        boxId: boxId,
      },
    });

    if (!existingCard) {
      return NextResponse.json({ error: 'Card not found in this box' }, { status: 404 });
    }

    // Delete the card
    await prisma.card.delete({
      where: { id: cardId },
    });

    // Revalidate cache
    revalidatePath(`/admin/boxes/${boxId}/edit`);
    revalidatePath(`/admin/boxes`);
    revalidatePath(`/boxes`);

    return NextResponse.json({ 
      success: true, 
      message: 'Card removed successfully' 
    });
  } catch (error) {
    console.error('Error deleting card:', error);
    return NextResponse.json(
      { error: 'Failed to delete card' },
      { status: 500 }
    );
  }
}