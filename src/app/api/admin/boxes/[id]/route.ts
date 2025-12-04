import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const boxUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  imageUrl: z.string().min(1).optional(),
  price: z.number().int().positive().optional(),
  cardsPerPack: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

// Update box
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const body = await request.json();
    const data = boxUpdateSchema.parse(body);

    const box = await prisma.box.update({
      where: { id },
      data,
    });

    // Revalidate cache to update pages immediately
    revalidatePath('/boxes');
    revalidatePath('/admin/boxes');
    revalidatePath(`/admin/boxes/${id}/edit`);

    return NextResponse.json({ success: true, box });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Box update error:', error);
    return NextResponse.json({ error: 'Failed to update box' }, { status: 500 });
  }
}

// Delete box
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    // Check if box exists
    const box = await prisma.box.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            pulls: true,
          },
        },
      },
    });

    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    // Delete box (cascade will handle related cards and pulls)
    await prisma.box.delete({
      where: { id },
    });

    // Revalidate cache to update pages immediately
    revalidatePath('/boxes');
    revalidatePath('/admin/boxes');

    return NextResponse.json({ 
      success: true, 
      message: 'Box deleted successfully' 
    });
  } catch (error) {
    console.error('Box delete error:', error);
    return NextResponse.json({ error: 'Failed to delete box' }, { status: 500 });
  }
}

// Get box by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    const box = await prisma.box.findUnique({
      where: { id },
      include: {
        cards: {
          orderBy: { coinValue: 'desc' },
        },
      },
    });

    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      box: {
        ...box,
        cards: box.cards.map(card => ({
          ...card,
          pullRate: Number(card.pullRate),
        })),
      }
    });
  } catch (error) {
    console.error('Error fetching box:', error);
    return NextResponse.json({ error: 'Failed to fetch box' }, { status: 500 });
  }
}

