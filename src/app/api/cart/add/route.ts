import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const addToCartSchema = z.object({
  pullId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Rate limit cart operations
    const rateLimitResult = await rateLimit(request, 'general');
    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { pullId } = addToCartSchema.parse(body);

    // Verify pull belongs to user
    const pull = await prisma.pull.findUnique({
      where: { id: pullId },
    });

    if (!pull || pull.userId !== user.id) {
      return NextResponse.json({ error: 'Pull not found or not owned by user' }, { status: 404 });
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId: user.id },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: user.id },
      });
    }

    // Check if already in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: { pullId },
    });

    if (existingItem) {
      return NextResponse.json({ error: 'Item already in cart' }, { status: 400 });
    }

    // Add to cart
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        pullId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error adding to cart:', error);
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
  }
}

