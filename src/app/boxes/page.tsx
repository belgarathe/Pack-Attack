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
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {boxes.map((box) => (
              <Link 
                key={box.id} 
                href={`/open/${box.id}`}
                className="group glass rounded-xl overflow-hidden card-lift"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
                  {box.imageUrl ? (
                    <Image
                      src={box.imageUrl}
                      alt={box.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-700" />
                    </div>
                  )}
                  {box.featured && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[10px] font-bold text-white">
                      ⭐ Featured
                    </div>
                  )}
                  {box.games && box.games[0] && (
                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold badge-${box.games[0].toLowerCase()}`}>
                      {box.games[0]}
                    </div>
                  )}
                  {/* Price overlay on image */}
                  <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-sm flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">{box.price.toLocaleString()}</span>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors line-clamp-1">
                    {box.name}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>{box.cardsPerPack} cards/pack</span>
                    <div className="flex items-center gap-0.5 text-blue-400 font-medium group-hover:translate-x-0.5 transition-transform">
                      Open <ChevronRight className="w-3 h-3" />
                    </div>
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
