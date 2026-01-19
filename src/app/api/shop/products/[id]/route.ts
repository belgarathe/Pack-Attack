import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET single product
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const product = await prisma.shopProduct.findUnique({
      where: { id },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            logo: true,
            description: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        price: Number(product.price),
        comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
      },
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

// PUT - Update product (Shop Owner only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const product = await prisma.shopProduct.findUnique({
      where: { id },
      include: { shop: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check ownership
    if (user.role !== 'ADMIN' && product.shop.ownerId !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own products' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, price, comparePrice, images, category, game, condition, stock, sku, isActive, featured } = body;

    const updated = await prisma.shopProduct.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(comparePrice !== undefined && { comparePrice }),
        ...(images !== undefined && { images }),
        ...(category !== undefined && { category }),
        ...(game !== undefined && { game }),
        ...(condition !== undefined && { condition }),
        ...(stock !== undefined && { stock }),
        ...(sku !== undefined && { sku }),
        ...(isActive !== undefined && { isActive }),
        ...(featured !== undefined && { featured }),
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
        ...updated,
        price: Number(updated.price),
        comparePrice: updated.comparePrice ? Number(updated.comparePrice) : null,
      },
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE product (Shop Owner only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const product = await prisma.shopProduct.findUnique({
      where: { id },
      include: { shop: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check ownership
    if (user.role !== 'ADMIN' && product.shop.ownerId !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own products' }, { status: 403 });
    }

    await prisma.shopProduct.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
