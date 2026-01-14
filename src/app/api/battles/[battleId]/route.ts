import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE - Delete a completed battle (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ battleId: string }> }
) {
  try {
    const session = await getCurrentSession();
    const { battleId } = await params;

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get the battle
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        pulls: true,
      },
    });

    if (!battle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }

    // Only allow deletion of completed battles
    if (battle.status !== 'FINISHED' && battle.status !== 'CANCELLED') {
      return NextResponse.json({ 
        error: 'Can only delete completed or cancelled battles' 
      }, { status: 400 });
    }

    // Delete the battle (cascade will handle related records)
    await prisma.battle.delete({
      where: { id: battleId },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Battle deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting battle:', error);
    return NextResponse.json({ error: 'Failed to delete battle' }, { status: 500 });
  }
}

// GET - Get a specific battle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ battleId: string }> }
) {
  try {
    const { battleId } = await params;

    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        box: {
          include: {
            cards: {
              orderBy: { coinValue: 'desc' },
              take: 3,
            }
          }
        },
        participants: {
          include: { user: { select: { id: true, name: true, email: true, isBot: true } } },
        },
        winner: { select: { id: true, name: true, email: true } },
        pulls: {
          include: {
            participant: {
              include: { user: true },
            },
            pull: {
              include: { card: true },
            },
          },
          orderBy: [
            { roundNumber: 'asc' },
            { pulledAt: 'asc' },
          ],
        },
      },
    });

    if (!battle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, battle });
  } catch (error) {
    console.error('Error fetching battle:', error);
    return NextResponse.json({ error: 'Failed to fetch battle' }, { status: 500 });
  }
}
