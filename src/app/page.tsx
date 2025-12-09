import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Package, Trophy, Users, Swords, Coins, Clock, ChevronRight, Sparkles } from 'lucide-react';

// Fetch stats from database
async function getStats() {
  try {
    const [boxesOpened, battlesRun, usersCount] = await Promise.all([
      prisma.pull.count(),
      prisma.battle.count(),
      prisma.user.count(),
    ]);
    return { boxesOpened, battlesRun, usersOnline: usersCount };
  } catch {
    return { boxesOpened: 0, battlesRun: 0, usersOnline: 0 };
  }
}

// Fetch featured boxes from database
async function getFeaturedBoxes() {
  try {
    const boxes = await prisma.box.findMany({
      where: {
        featured: true,
        isActive: true,
      },
      orderBy: {
        popularity: 'desc',
      },
      take: 6,
      include: {
        _count: {
          select: { cards: true }
        }
      }
    });
    return boxes;
  } catch {
    return [];
  }
}

// Fetch active battles from database
async function getActiveBattles() {
  try {
    const battles = await prisma.battle.findMany({
      where: {
        status: {
          in: ['WAITING', 'IN_PROGRESS'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 3,
      include: {
        box: true,
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    return battles;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [stats, featuredBoxes, activeBattles] = await Promise.all([
    getStats(),
    getFeaturedBoxes(),
    getActiveBattles(),
  ]);

  const hasContent = featuredBoxes.length > 0 || activeBattles.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />
      
      {/* Floating decorative elements */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-float hidden lg:block" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float hidden lg:block" style={{ animationDelay: '2s' }} />

      {/* Hero Section */}
      <section className="relative container pt-20 pb-16 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full glass border border-blue-500/20">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-gray-300">The Ultimate TCG Experience</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight">
          <span className="text-white">PACK </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-gradient">
            ATTACK
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-gray-400 mb-4 font-light">
          Open Packs. Battle. Win Real Cards.
        </p>
        <p className="mx-auto max-w-2xl text-gray-400 mb-10 text-lg">
          Experience the thrill of opening trading card packs and battling other Players.
          Every pack is a chance at glory.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          <Link 
            href="/boxes" 
            className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 shimmer"
          >
            <Package className="w-5 h-5" />
            Start Opening
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            href="/battles" 
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 gradient-border bg-gray-900/50 hover:bg-gray-800/50"
          >
            <Swords className="w-5 h-5" />
            View Battles
          </Link>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative container mb-16">
        <div className="glass-strong rounded-2xl p-6 md:p-8">
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-xl bg-blue-500/20">
                <Package className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-white font-mono">{stats.boxesOpened.toLocaleString()}</div>
              <div className="text-sm text-gray-400 mt-1">Packs Opened</div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-xl bg-purple-500/20">
                <Trophy className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-white font-mono">{stats.battlesRun.toLocaleString()}</div>
              <div className="text-sm text-gray-400 mt-1">Battles Complete</div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-xl bg-green-500/20">
                <Users className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-white font-mono">{stats.usersOnline.toLocaleString()}</div>
              <div className="text-sm text-gray-400 mt-1">Players</div>
            </div>
          </div>
        </div>
      </section>

      {hasContent ? (
        <>
          {/* Featured Boxes */}
          {featuredBoxes.length > 0 && (
            <section className="relative container mb-16">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 mb-2 rounded-full glass text-sm">
                    <Package className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-300">Featured Packs</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-white">Hot Boxes</h2>
                </div>
                <Link 
                  href="/boxes" 
                  className="group inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View All
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredBoxes.map((box) => (
                  <Link 
                    key={box.id} 
                    href={`/open/${box.id}`}
                    className="group glass rounded-2xl overflow-hidden card-lift"
                  >
                    <div className="aspect-[4/3] relative bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                      {box.imageUrl ? (
                        <img 
                          src={box.imageUrl} 
                          alt={box.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <Package className="w-16 h-16 text-gray-600" />
                      )}
                      {/* Game badge */}
                      {box.games && box.games[0] && (
                        <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold badge-${box.games[0].toLowerCase()}`}>
                          {box.games[0]}
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                        {box.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-amber-400">
                          <Coins className="w-4 h-4" />
                          <span className="font-semibold">{box.price}</span>
                        </div>
                        <span className="text-sm text-gray-500">{box._count.cards} cards</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Live Battles */}
          {activeBattles.length > 0 && (
            <section className="relative container pb-20">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 mb-2 rounded-full glass text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500 pulse-live" />
                    <span className="text-gray-300">Live Now</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-white">Active Battles</h2>
                </div>
                <Link 
                  href="/battles" 
                  className="group inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  View All
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeBattles.map((battle) => (
                  <Link 
                    key={battle.id} 
                    href={`/battles/${battle.id}`}
                    className="group glass rounded-2xl p-5 card-lift"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                        battle.status === 'WAITING' 
                          ? 'bg-yellow-500/20 text-yellow-400' 
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {battle.status === 'WAITING' ? (
                          <>
                            <Clock className="w-3 h-3" />
                            Waiting
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 rounded-full bg-green-500 pulse-live" />
                            In Progress
                          </>
                        )}
                      </span>
                      <span className="text-sm text-gray-500">{battle.maxParticipants} players</span>
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-purple-400 transition-colors">
                      {battle.box.name} Battle
                    </h3>

                    {/* Participants */}
                    <div className="flex items-center gap-2 mb-4">
                      {battle.participants.slice(0, 4).map((p, i) => (
                        <div 
                          key={p.id}
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white"
                          style={{ marginLeft: i > 0 ? '-8px' : '0' }}
                        >
                          {p.user.name?.[0] || '?'}
                        </div>
                      ))}
                      {battle.participants.length > 4 && (
                        <span className="text-sm text-gray-400 ml-2">
                          +{battle.participants.length - 4} more
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                      <div className="flex items-center gap-1 text-amber-400">
                        <Coins className="w-4 h-4" />
                        <span className="font-semibold">{battle.box.price} entry</span>
                      </div>
                      <span className="text-purple-400 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        Join <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        /* Coming Soon Section */
        <section className="relative container pb-20">
          <div className="glass-strong rounded-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <Package className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Coming Soon</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              We&apos;re preparing amazing boxes and battles for you. 
              Create an account to be notified when we launch!
            </p>
            <Link 
              href="/register" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105"
            >
              <Sparkles className="w-5 h-5" />
              Get Notified
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
