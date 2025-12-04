import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const boxSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.string().min(1), // Allow any string, not just URLs (some APIs return relative paths)
  price: z.number().int().positive(),
  cardsPerPack: z.number().int().positive(),
  games: z.array(z.enum(['MAGIC_THE_GATHERING', 'ONE_PIECE', 'POKEMON', 'LORCANA'])).min(1),
});

export async function POST(request: Request) {
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

    const body = await request.json();
    const data = boxSchema.parse(body);

    const box = await prisma.box.create({
      data: {
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        price: data.price,
        cardsPerPack: data.cardsPerPack,
        games: data.games,
        isActive: true, // Ensure box is active so it shows in marketplace
      },
    });

    // Revalidate cache to update pages immediately
    revalidatePath('/boxes');
    revalidatePath('/admin/boxes');

    return NextResponse.json({ success: true, box });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Box creation error:', error);
    return NextResponse.json({ error: 'Failed to create box' }, { status: 500 });
  }
}

export async function GET() {
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

    const boxes = await prisma.box.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, boxes });
  } catch (error) {
    console.error('Error fetching boxes:', error);
    return NextResponse.json({ error: 'Failed to fetch boxes' }, { status: 500 });
  }
}

