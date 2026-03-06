import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    const shopId = req.nextUrl.searchParams.get('shopId') || user.shop?.id;
    if (!shopId) {
      return NextResponse.json({ error: 'No shop found' }, { status: 404 });
    }

    if (user.role === 'SHOP_OWNER' && user.shop?.id !== shopId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const search = req.nextUrl.searchParams.get('search') || '';
    const game = req.nextUrl.searchParams.get('game') || '';
    const category = req.nextUrl.searchParams.get('category') || '';
    const status = req.nextUrl.searchParams.get('status') || '';
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 100);

    const where: any = { shopId };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (game) where.game = game;
    if (category) where.category = category;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (status === 'out_of_stock') { where.isActive = true; where.stock = 0; }

    const [products, total] = await Promise.all([
      prisma.shopProduct.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          isActive: true,
          category: true,
          game: true,
          condition: true,
          sku: true,
          images: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.shopProduct.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      products: products.map(p => ({ ...p, price: Number(p.price) })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching stock:', error);
    return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 });
  }
}
