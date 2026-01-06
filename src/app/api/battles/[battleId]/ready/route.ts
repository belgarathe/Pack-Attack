import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Mark yourself as ready
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ battleId: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { battleId } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the battle
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, email: true, isBot: true } } },
        },
      },
    });

    if (!battle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }

    if (battle.status !== 'WAITING') {
      return NextResponse.json({ error: 'Battle is not in waiting state' }, { status: 400 });
    }

    // Check if battle is full
    if (battle.participants.length < battle.maxParticipants) {
      return NextResponse.json({ error: 'Battle is not full yet' }, { status: 400 });
    }

    // Find participant
    const participant = battle.participants.find(p => p.userId === user.id);
    if (!participant) {
      return NextResponse.json({ error: 'You are not in this battle' }, { status: 400 });
    }

    // Mark as ready
    await prisma.battleParticipant.update({
      where: { id: participant.id },
      data: { isReady: true },
    });

    // Check if all participants are now ready
    const updatedBattle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, email: true, isBot: true } } },
        },
      },
    });

    const allReady = updatedBattle?.participants.every(p => p.isReady) ?? false;

    return NextResponse.json({ 
      success: true, 
      isReady: true,
      allReady,
      participants: updatedBattle?.participants.map(p => ({
        id: p.id,
        userId: p.userId,
        name: p.user.name || p.user.email,
        isReady: p.isReady,
        isBot: p.user.isBot,
      })),
    });
  } catch (error) {
    console.error('Error marking ready:', error);
    return NextResponse.json({ error: 'Failed to mark as ready' }, { status: 500 });
  }
}

// DELETE - Unready yourself
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ battleId: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { battleId } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const participant = await prisma.battleParticipant.findFirst({
      where: { battleId, userId: user.id },
    });

    if (!participant) {
      return NextResponse.json({ error: 'You are not in this battle' }, { status: 400 });
    }

    await prisma.battleParticipant.update({
      where: { id: participant.id },
      data: { isReady: false },
    });

    return NextResponse.json({ success: true, isReady: false });
  } catch (error) {
    console.error('Error unmarking ready:', error);
    return NextResponse.json({ error: 'Failed to unmark ready' }, { status: 500 });
  }
}

