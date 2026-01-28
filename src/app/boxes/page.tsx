import { prisma } from '@/lib/prisma';
import { Package } from 'lucide-react';
import BoxesClient from './BoxesClient';

// PERFORMANCE: Use ISR with 60-second revalidation instead of force-dynamic
// This caches the page and regenerates it every 60 seconds, reducing DB load
export const revalidate = 60; // Revalidate every 60 seconds

async function getBoxes() {
  try {
    return await prisma.box.findMany({
      where: { isActive: true },
      orderBy: [
        { featured: 'desc' },
        { popularity: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        _count: {
          select: { cards: true }
        },
        cards: {
          orderBy: { coinValue: 'desc' },
          take: 3,
          select: {
            id: true,
            name: true,
            imageUrlGatherer: true,
            coinValue: true,
          }
        },
        createdByShop: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });
  } catch {
    return [];
  }
}

export default async function BoxesPage() {
  const rawBoxes = await getBoxes();

  // Convert Decimal to Number for client component
  const boxes = rawBoxes.map(box => ({
    ...box,
    price: Number(box.price),
    cards: box.cards.map(card => ({
      ...card,
      coinValue: Number(card.coinValue),
    })),
  }));

  // Extract unique games from all boxes
  const availableGames = [...new Set(
    boxes.flatMap(box => box.games || [])
  )].sort();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />

      <div className="relative container py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full glass text-sm">
            <Package className="w-4 h-4 text-blue-400" />
            <span className="text-gray-300">Card Packs</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="text-white">All </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Boxes</span>
          </h1>
          <p className="text-gray-400 text-lg">Browse and open packs to build your collection</p>
        </div>

        {/* Client-side filterable boxes */}
        <BoxesClient boxes={boxes} availableGames={availableGames} />
      </div>
    </div>
  );
}
