import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - List boxes created by the shop owner
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { shop: true },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SHOP_OWNER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let boxes;
    if (user.role === 'ADMIN') {
      // Admin can see all shop-created boxes
      boxes = await prisma.box.findMany({
        where: { createdByShopId: { not: null } },
        include: {
          cards: { select: { id: true } },
          createdByShop: { select: { id: true, name: true } },
          _count: { select: { pulls: true, shopBoxOrders: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (user.shop) {
      // Shop owner sees only their boxes
      boxes = await prisma.box.findMany({
        where: { createdByShopId: user.shop.id },
        include: {
          cards: { select: { id: true } },
          _count: { select: { pulls: true, shopBoxOrders: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      boxes = [];
    }

    return NextResponse.json({ success: true, boxes });
  } catch (error) {
    console.error('Error fetching shop boxes:', error);
    return NextResponse.json({ error: 'Failed to fetch boxes' }, { status: 500 });
  }
}

// POST - Create a new box
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { shop: true },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SHOP_OWNER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Shop owner must have a shop
    if (user.role === 'SHOP_OWNER' && !user.shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 400 });
    }

    const { name, description, price, cardsPerPack, games, imageUrl } = await req.json();

    if (!name || !description || !price || !cardsPerPack) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create the box with shop association
    const box = await prisma.box.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        cardsPerPack: parseInt(cardsPerPack),
        games: games || ['MAGIC_THE_GATHERING'],
        imageUrl: imageUrl || '',
        isActive: true,
        createdByShopId: user.shop?.id || null, // Admin-created boxes have null shopId
      },
    });

    return NextResponse.json({ success: true, box });
  } catch (error) {
    console.error('Error creating shop box:', error);
    return NextResponse.json({ error: 'Failed to create box' }, { status: 500 });
  }
}
