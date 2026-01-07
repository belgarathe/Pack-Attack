import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ battleId: string }> }
) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'battleJoin');
    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'You must be logged in to join a battle' }, { status: 401 });
    }

    const { battleId } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the battle with participants
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        box: true,
        participants: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!battle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }

    // Check if battle is still waiting for participants
    if (battle.status !== 'WAITING') {
      return NextResponse.json({ error: 'This battle is no longer accepting participants' }, { status: 400 });
    }

    // Check if battle is full
    if (battle.participants.length >= battle.maxParticipants) {
      return NextResponse.json({ error: 'This battle is full' }, { status: 400 });
    }

    // Check if user is already a participant
    const alreadyJoined = battle.participants.some(p => p.userId === user.id);
    if (alreadyJoined) {
      return NextResponse.json({ error: 'You are already in this battle' }, { status: 400 });
    }

    // Calculate total cost (entry fee + pack costs for all rounds)
    const packCost = battle.box.price * battle.rounds;
    const totalCost = battle.entryFee + packCost;

    // Check if user has enough coins
    if (user.coins < totalCost) {
      return NextResponse.json({ 
        error: `Not enough coins. You need ${totalCost} coins (${battle.entryFee} entry fee + ${packCost} for packs)`,
        required: totalCost,
        current: user.coins,
      }, { status: 400 });
    }

    // Deduct coins and add participant in a transaction
    const [updatedUser, participant] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { coins: { decrement: totalCost } },
      }),
      prisma.battleParticipant.create({
        data: {
          battleId: battle.id,
          userId: user.id,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    // Get updated battle
    const updatedBattle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        box: true,
        participants: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully joined the battle!',
      battle: updatedBattle,
      coinsDeducted: totalCost,
      newBalance: updatedUser.coins,
    });
  } catch (error) {
    console.error('Error joining battle:', error);
    return NextResponse.json({ error: 'Failed to join battle' }, { status: 500 });
  }
}



