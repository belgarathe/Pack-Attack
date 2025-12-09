import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';
import { Coins, Package, ChevronRight, Sparkles } from 'lucide-react';

// Force dynamic rendering for real-time updates
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
        }
      }
    });
  } catch {
    return [];
  }
}

export default async function BoxesPage() {
  const boxes = await getBoxes();

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

        {boxes.length === 0 ? (
          <div className="glass-strong rounded-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <Package className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No Boxes Available</h2>
            <p className="text-gray-400 mb-6">Check back soon for new boxes!</p>
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl transition-all hover:scale-105"
            >
              <Sparkles className="w-5 h-5" />
              Back to Home
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boxes.map((box) => (
              <Link 
                key={box.id} 
                href={`/open/${box.id}`}
                className="group glass rounded-2xl overflow-hidden card-lift"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
                  {box.imageUrl ? (
                    <Image
                      src={box.imageUrl}
                      alt={box.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-700" />
                    </div>
                  )}
                  {box.featured && (
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-xs font-bold text-white">
                      ⭐ Featured
                    </div>
                  )}
                  {box.games && box.games[0] && (
                    <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold badge-${box.games[0].toLowerCase()}`}>
                      {box.games[0]}
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-1">
                    {box.name}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{box.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-amber-400">
                        <Coins className="w-4 h-4" />
                        <span className="font-bold">{box.price.toLocaleString()}</span>
                      </div>
                      <span className="text-sm text-gray-500">coins</span>
                    </div>
                    <div className="flex items-center gap-1 text-blue-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                      Open <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between text-sm">
                    <span className="text-gray-500">{box.cardsPerPack} cards/pack</span>
                    <span className="text-gray-500">{box._count.cards} total cards</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
