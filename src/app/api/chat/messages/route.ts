import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// In-memory rate limiting (per user, 1 message per second)
const rateLimitMap = new Map<string, number>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const lastMessage = rateLimitMap.get(userId);
  if (lastMessage && now - lastMessage < 1000) {
    return false; // Rate limited
  }
  rateLimitMap.set(userId, now);
  // Clean up old entries every 100 checks
  if (rateLimitMap.size > 1000) {
    const cutoff = now - 60000;
    for (const [key, time] of rateLimitMap) {
      if (time < cutoff) rateLimitMap.delete(key);
    }
  }
  return true;
}

// GET: Load recent messages
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor'); // For pagination
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

  try {
    const messages = await prisma.chatMessage.findMany({
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            twitchUsername: true,
            role: true,
          },
        },
      },
    });

    // Reverse so oldest is first (for chat display)
    const sorted = messages.reverse();

    return NextResponse.json({
      success: true,
      messages: sorted.map((msg) => ({
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
        user: {
          id: msg.user.id,
          name: msg.user.twitchUsername || msg.user.name || 'Anonymous',
          image: msg.user.image,
          isTwitch: !!msg.user.twitchUsername,
          role: msg.user.role,
        },
      })),
      nextCursor: messages.length > 0 ? messages[0].id : null,
    });
  } catch (error) {
    console.error('Chat GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load messages' }, { status: 500 });
  }
}

// POST: Send a message
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in to chat' }, { status: 401 });
  }

  // Rate limit
  if (!checkRateLimit(session.user.id)) {
    return NextResponse.json({ error: 'Slow down! 1 message per second.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const content = (body.content || '').trim();

    if (!content) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'Message too long (max 500 chars)' }, { status: 400 });
    }

    const message = await prisma.chatMessage.create({
      data: {
        content,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            twitchUsername: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        user: {
          id: message.user.id,
          name: message.user.twitchUsername || message.user.name || 'Anonymous',
          image: message.user.image,
          isTwitch: !!message.user.twitchUsername,
          role: message.user.role,
        },
      },
    });
  } catch (error) {
    console.error('Chat POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
  }
}
