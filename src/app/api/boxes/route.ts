import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
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

      // Update box image if needed
      if (box.cards.length > 0 && box.cards[0].imageUrlGatherer && box.imageUrl !== box.cards[0].imageUrlGatherer) {
        await prisma.box.update({
          where: { id: box.id },
          data: { imageUrl: box.cards[0].imageUrlGatherer },
        });
        box.imageUrl = box.cards[0].imageUrlGatherer;
      }

      // Convert Decimal to number for pullRate
      const boxWithNumbers = {
        ...box,
        cards: box.cards.map(card => ({
          ...card,
          pullRate: Number(card.pullRate),
        })),
      };

      return NextResponse.json({ success: true, boxes: [boxWithNumbers] });
    }

    const boxes = await prisma.box.findMany({
      where: { isActive: true },
      include: {
        cards: {
          orderBy: { coinValue: 'desc' },
          take: 1,
        },
      },
      orderBy: [
        { featured: 'desc' },
        { popularity: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Update box images to highest coin value card (async, don't block response)
    Promise.all(
      boxes.map(async (box) => {
        if (box.cards.length > 0 && box.cards[0].imageUrlGatherer && box.imageUrl !== box.cards[0].imageUrlGatherer) {
          await prisma.box.update({
            where: { id: box.id },
            data: { imageUrl: box.cards[0].imageUrlGatherer },
          });
        }
      })
    ).catch(console.error);

    return NextResponse.json({ success: true, boxes });
  } catch (error) {
    console.error('Error fetching boxes:', error);
    return NextResponse.json({ error: 'Failed to fetch boxes' }, { status: 500 });
  }
}
