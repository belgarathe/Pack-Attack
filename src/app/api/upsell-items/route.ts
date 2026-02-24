import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const items = await prisma.upsellItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        imageUrl: item.imageUrl,
        price: Number(item.price),
        externalUrl: item.externalUrl,
      })),
    });
  } catch (error) {
    console.error('Error fetching upsell items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}
