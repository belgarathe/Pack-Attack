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
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {boxes.map((box) => (
              <Link 
                key={box.id} 
                href={`/open/${box.id}`}
                className="group glass rounded-xl overflow-hidden card-lift"
              >
                {/* Card Preview Section - Fanned Cards */}
                <div className="relative h-48 bg-gradient-to-b from-gray-800/50 to-gray-900/80 flex items-end justify-center pb-2 overflow-hidden">
                  {/* Background glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 via-transparent to-transparent" />
                  
                  {/* Fanned Cards Display */}
                  {box.cards && box.cards.length > 0 ? (
                    <div className="relative h-40 w-full flex items-center justify-center">
                      {box.cards.slice(0, 3).map((card, index) => {
                        const rotations = [-15, 0, 15];
                        const translations = [-20, 0, 20];
                        const zIndexes = [1, 3, 2];
                        return (
                          <div
                            key={card.id}
                            className="absolute transition-transform duration-300 group-hover:scale-105"
                            style={{
                              transform: `rotate(${rotations[index]}deg) translateX(${translations[index]}px)`,
                              zIndex: zIndexes[index],
                            }}
                          >
                            <div className="relative w-20 h-[110px] rounded-md overflow-hidden border-2 border-gray-600 shadow-lg group-hover:border-amber-400/50 transition-colors bg-gray-800">
                              {card.imageUrlGatherer ? (
                                <Image
                                  src={card.imageUrlGatherer}
                                  alt={card.name}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-700">
                                  <span className="text-[8px] text-gray-500">?</span>
                                </div>
                              )}
                              {/* Value badge on top card */}
                              {index === 1 && (
                                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/80 flex items-center gap-0.5">
                                  <Coins className="w-2 h-2 text-amber-400" />
                                  <span className="text-[8px] font-bold text-amber-400">{card.coinValue}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="w-12 h-12 text-gray-600" />
                    </div>
                  )}

                  {/* Badges */}
                  {box.featured && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[10px] font-bold text-white z-10">
                      ⭐ Featured
                    </div>
                  )}
                  {box.games && box.games[0] && (
                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold badge-${box.games[0].toLowerCase()} z-10`}>
                      {box.games[0]}
                    </div>
                  )}
                </div>

                {/* Box Info */}
                <div className="p-4 border-t border-gray-800">
                  <h3 className="text-sm font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-1">
                    {box.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Coins className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-bold text-amber-400">{box.price.toLocaleString()}</span>
                      <span className="text-xs text-gray-500">coins</span>
                    </div>
                    <div className="flex items-center gap-0.5 text-blue-400 text-xs font-medium group-hover:translate-x-0.5 transition-transform">
                      Open <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-800/50 flex items-center justify-between text-[11px] text-gray-500">
                    <span>{box.cardsPerPack} cards/pack</span>
                    <span>{box._count.cards} total</span>
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
