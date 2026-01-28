import { NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const box = await withRetry(
        () => prisma.box.findUnique({
          where: { id },
          include: {
            cards: {
              orderBy: { coinValue: 'desc' },
            },
          },
        }),
        'boxes:findOne'
      );

      if (!box) {
        return NextResponse.json({ error: 'Box not found' }, { status: 404 });
      }

      // Update box image if needed
      if (box.cards.length > 0 && box.cards[0].imageUrlGatherer && box.imageUrl !== box.cards[0].imageUrlGatherer) {
        await prisma.box.update({
          where: { id: box.id },
          data: { imageUrl: box.cards[0].imageUrlGatherer },
        });
        box.imageUrl = box.cards[0].imageUrlGatherer;
      }

      // Convert Decimal to number for pullRate, coinValue, and price
      const boxWithNumbers = {
        ...box,
        price: Number(box.price),
        cards: box.cards.map(card => ({
          ...card,
          pullRate: Number(card.pullRate),
          coinValue: Number(card.coinValue),
        })),
      };

      return NextResponse.json({ success: true, boxes: [boxWithNumbers] });
    }

    const boxes = await withRetry(
      () => prisma.box.findMany({
        where: { isActive: true },
        include: {
          cards: {
            orderBy: { coinValue: 'desc' },
            take: 3,
            select: {
              id: true,
              name: true,
              imageUrlGatherer: true,
              imageUrlScryfall: true,
              coinValue: true,
            },
          },
          _count: {
            select: { cards: true },
          },
        },
        orderBy: [
          { featured: 'desc' },
          { popularity: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      'boxes:findMany'
    );

    // NOTE: Box image updates are now handled in admin routes only
    // Removed fire-and-forget updates that could cause memory leaks

    // Convert Decimal values to numbers for JSON response
    const boxesWithNumbers = boxes.map(box => ({
      ...box,
      price: Number(box.price),
      cards: box.cards.map(card => ({
        ...card,
        coinValue: Number(card.coinValue),
      })),
    }));

    return NextResponse.json({ success: true, boxes: boxesWithNumbers });
  } catch (error) {
    console.error('Error fetching boxes:', error);
    return NextResponse.json({ error: 'Failed to fetch boxes' }, { status: 500 });
  }
}
