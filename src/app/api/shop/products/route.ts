import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET all active products
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const game = searchParams.get('game');
    const shopId = searchParams.get('shopId');
    const featured = searchParams.get('featured');
    const search = searchParams.get('search');

    const where: any = {
      isActive: true,
      stock: { gt: 0 },
      shop: { isActive: true },
    };

    if (category) where.category = category;
    if (game) where.game = game;
    if (shopId) where.shopId = shopId;
    if (featured === 'true') where.featured = true;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.shopProduct.findMany({
      where,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
      orderBy: [
        { featured: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Convert Decimal to Number for JSON serialization
    const serializedProducts = products.map(product => ({
      ...product,
      price: Number(product.price),
      comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
    }));

    return NextResponse.json({ success: true, products: serializedProducts });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST - Create new product (Shop Owner only)
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

    if (!user || (user.role !== 'SHOP_OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Only shop owners can create products' }, { status: 403 });
    }

    if (!user.shop) {
      return NextResponse.json({ error: 'You need to create a shop first' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, price, comparePrice, images, category, game, condition, stock, sku, featured } = body;

    if (!name || !price || !category) {
      return NextResponse.json({ error: 'Name, price, and category are required' }, { status: 400 });
    }

    const product = await prisma.shopProduct.create({
      data: {
        shopId: user.shop.id,
        name,
        description: description || null,
        price,
        comparePrice: comparePrice || null,
        images: images || [],
        category,
        game: game || null,
        condition: condition || 'NEAR_MINT',
        stock: stock || 0,
        sku: sku || null,
        featured: featured || false,
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        price: Number(product.price),
        comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
      },
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
