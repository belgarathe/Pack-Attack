import { NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/prisma';
import { boxCache, cacheKeys, requestDeduplicator } from '@/lib/cache';

// PERFORMANCE: Cache TTL for box listings (5 minutes)
const BOX_LIST_CACHE_TTL = 5 * 60 * 1000;
const BOX_DETAIL_CACHE_TTL = 10 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // PERFORMANCE: Check cache first for individual box
      const cacheKey = cacheKeys.box(id);
      const cached = boxCache.get(cacheKey);
      if (cached) {
        return NextResponse.json({ success: true, boxes: [cached] });
      }

      // Use request deduplication to prevent thundering herd
      const box = await requestDeduplicator.dedupe(cacheKey, () =>
        withRetry(
          () => prisma.box.findUnique({
            where: { id },
            include: {
              cards: {
                orderBy: { coinValue: 'desc' },
              },
            },
          }),
          'boxes:findOne'
        )
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

      // Cache the result
      boxCache.set(cacheKey, boxWithNumbers, BOX_DETAIL_CACHE_TTL);

      return NextResponse.json({ success: true, boxes: [boxWithNumbers] });
    }

    // PERFORMANCE: Check cache for box list
    const listCacheKey = cacheKeys.boxList();
    const cachedList = boxCache.get(listCacheKey);
    if (cachedList) {
      return NextResponse.json({ success: true, boxes: cachedList });
    }

    // Use request deduplication for box list
    const boxes = await requestDeduplicator.dedupe(listCacheKey, () =>
      withRetry(
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
      )
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

    // Cache the box list
    boxCache.set(listCacheKey, boxesWithNumbers, BOX_LIST_CACHE_TTL);

    return NextResponse.json({ success: true, boxes: boxesWithNumbers });
  } catch (error) {
    console.error('Error fetching boxes:', error);
    return NextResponse.json({ error: 'Failed to fetch boxes' }, { status: 500 });
  }
}
