import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get owner's shop
export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        shop: {
          include: {
            products: {
              orderBy: { createdAt: 'desc' },
            },
            _count: {
              select: {
                products: true,
                orders: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'SHOP_OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not a shop owner' }, { status: 403 });
    }

    if (!user.shop) {
      return NextResponse.json({ success: true, shop: null });
    }

    const shop = {
      ...user.shop,
      products: user.shop.products.map(p => ({
        ...p,
        price: Number(p.price),
        comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
      })),
    };

    return NextResponse.json({ success: true, shop });
  } catch (error) {
    console.error('Error fetching shop:', error);
    return NextResponse.json({ error: 'Failed to fetch shop' }, { status: 500 });
  }
}

// POST - Create shop
export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { shop: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'SHOP_OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only shop owners can create a shop' }, { status: 403 });
    }

    if (user.shop) {
      return NextResponse.json({ error: 'You already have a shop' }, { status: 400 });
    }

    const { name, description, logo, banner } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Shop name is required' }, { status: 400 });
    }

    const shop = await prisma.shop.create({
      data: {
        ownerId: user.id,
        name,
        description: description || null,
        logo: logo || null,
        banner: banner || null,
      },
    });

    return NextResponse.json({ success: true, shop });
  } catch (error) {
    console.error('Error creating shop:', error);
    return NextResponse.json({ error: 'Failed to create shop' }, { status: 500 });
  }
}

// PUT - Update shop
export async function PUT(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { shop: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.shop) {
      return NextResponse.json({ error: 'You do not have a shop' }, { status: 404 });
    }

    const { name, description, logo, banner, isActive } = await request.json();

    const updated = await prisma.shop.update({
      where: { id: user.shop.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(logo !== undefined && { logo }),
        ...(banner !== undefined && { banner }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, shop: updated });
  } catch (error) {
    console.error('Error updating shop:', error);
    return NextResponse.json({ error: 'Failed to update shop' }, { status: 500 });
  }
}
