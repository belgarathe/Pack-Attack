import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Package, Trophy, Users, Swords, Coins, Clock, ChevronRight, Sparkles, Star, Flame, Zap } from 'lucide-react';
import type { Metadata } from 'next';

// SEO Metadata
export const metadata: Metadata = {
  title: 'Pack Attack - Open Trading Card Packs & Battle for Real Cards',
  description: 'Experience the thrill of opening trading card packs online. Open Pokemon, Magic, Yu-Gi-Oh, and more. Battle other players and win real cards shipped to your door!',
  keywords: ['trading cards', 'pack opening', 'pokemon cards', 'magic the gathering', 'yugioh', 'card battles', 'tcg'],
  openGraph: {
    title: 'Pack Attack - Open Trading Card Packs & Battle for Real Cards',
    description: 'Experience the thrill of opening trading card packs online. Battle other players and win real cards!',
    type: 'website',
    siteName: 'Pack Attack',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pack Attack - Open Trading Card Packs & Battle',
    description: 'Experience the thrill of opening trading card packs online.',
  },
};

// Enable ISR for homepage
export const revalidate = 60;

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

// Fetch the best pull from the last 24 hours (hit of the day)
async function getHitOfTheDay() {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pull = await prisma.pull.findFirst({
      where: {
        timestamp: { gte: yesterday },
        cardValue: { not: null },
        card: { isNot: null },
      },
      orderBy: { cardValue: 'desc' },
      include: {
        card: true,
        user: {
          select: { id: true, name: true },
        },
      },
    });

    if (!pull || !pull.card) {
      // Fallback: get the best pull ever if nothing today
      const bestEver = await prisma.pull.findFirst({
        where: {
          cardValue: { not: null },
          card: { isNot: null },
        },
        orderBy: { cardValue: 'desc' },
        include: {
          card: true,
          user: {
            select: { id: true, name: true },
          },
        },
      });
      return bestEver;
    }

    return pull;
  } catch {
    return null;
  }
}

// Fetch featured boxes from database
async function getFeaturedBoxes() {
  try {
    const boxes = await prisma.box.findMany({
      where: { featured: true, isActive: true },
      orderBy: { popularity: 'desc' },
      take: 6,
      include: { _count: { select: { cards: true } } },
    });
    return boxes.map(box => ({ ...box, price: Number(box.price) }));
  } catch {
    return [];
  }
}

// Fetch active battles from database
async function getActiveBattles() {
  try {
    const battles = await prisma.battle.findMany({
      where: { status: { in: ['WAITING', 'IN_PROGRESS'] } },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        box: true,
        participants: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });
    return battles.map(battle => ({
      ...battle,
      box: { ...battle.box, price: Number(battle.box.price) },
    }));
  } catch {
    return [];
  }
}

// Rarity color helper
function getRarityColor(rarity: string) {
  const r = rarity.toLowerCase();
  if (r.includes('mythic') || r.includes('secret') || r.includes('legendary')) return 'text-amber-400';
  if (r.includes('rare') || r.includes('ultra')) return 'text-blue-400';
  if (r.includes('uncommon') || r.includes('super')) return 'text-green-400';
  if (r.includes('epic') || r.includes('holo')) return 'text-purple-400';
  return 'text-gray-400';
}

function getRarityGlow(rarity: string) {
  const r = rarity.toLowerCase();
  if (r.includes('mythic') || r.includes('secret') || r.includes('legendary')) return 'shadow-amber-500/30';
  if (r.includes('rare') || r.includes('ultra')) return 'shadow-blue-500/30';
  if (r.includes('epic') || r.includes('holo')) return 'shadow-purple-500/30';
  return 'shadow-gray-500/10';
}

export default async function HomePage() {
  const [stats, hitOfTheDay, featuredBoxes, activeBattles] = await Promise.all([
    getStats(),
    getHitOfTheDay(),
    getFeaturedBoxes(),
    getActiveBattles(),
  ]);

  const hasContent = featuredBoxes.length > 0 || activeBattles.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-20" />
      <div className="fixed inset-0 radial-gradient" />
      <div className="fixed top-20 left-10 w-72 h-72 bg-blue-500/8 rounded-full blur-3xl hidden lg:block" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl hidden lg:block" />

      {/* ============================================ */}
      {/* HERO SECTION */}
      {/* ============================================ */}
      <section className="relative container pt-16 sm:pt-24 pb-8 sm:pb-12 text-center px-4">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 sm:mb-10 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs sm:text-sm text-gray-400 font-medium tracking-wide uppercase">The Ultimate TCG Experience</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black mb-6 sm:mb-8 tracking-tighter leading-[0.9]">
          <span className="text-white">PACK</span>
          <br className="sm:hidden" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
            ATTACK
          </span>
        </h1>

        {/* Tagline */}
        <p className="text-xl sm:text-2xl md:text-3xl text-gray-300 mb-3 font-semibold tracking-tight">
          Play. Rumble. Collect.
        </p>
        <p className="mx-auto max-w-lg text-gray-500 mb-10 sm:mb-12 text-base sm:text-lg">
          Open packs. Battle other players. Win real cards shipped to your door.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-6 px-4">
          <Link 
            href="/boxes" 
            className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25 active:scale-95 touch-target min-h-[56px] text-base"
          >
            <Package className="w-5 h-5" />
            Get a Pack!
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            href="/battles" 
            className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 active:scale-95 border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.15] touch-target min-h-[56px] text-base"
          >
            <Swords className="w-5 h-5" />
            View Battles
          </Link>
        </div>
      </section>

      {/* ============================================ */}
      {/* STATS BAR */}
      {/* ============================================ */}
      <section className="relative container mb-16 sm:mb-20 px-4">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 sm:p-8">
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            {[
              { icon: Package, value: stats.boxesOpened, label: 'Packs Opened', color: 'blue' },
              { icon: Swords, value: stats.battlesRun, label: 'Battles Complete', color: 'purple' },
              { icon: Users, value: stats.usersOnline, label: 'Players', color: 'green' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className={`inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 mb-3 rounded-xl bg-${stat.color}-500/15`}>
                  <stat.icon className={`w-5 h-5 sm:w-5.5 sm:h-5.5 text-${stat.color}-400`} />
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white tabular-nums">{stat.value.toLocaleString()}</div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* HIT OF THE DAY */}
      {/* ============================================ */}
      {hitOfTheDay && hitOfTheDay.card && (
        <section className="relative container mb-16 sm:mb-20 px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-3 rounded-full border border-amber-500/20 bg-amber-500/5">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-sm text-amber-400 font-semibold">Hit of the Day</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">Today&apos;s Best Pull</h2>
          </div>

          <div className="max-w-sm mx-auto">
            {/* Card with glow */}
            <div className={`relative rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02] p-4 shadow-2xl ${getRarityGlow(hitOfTheDay.card.rarity)}`}>
              {/* Card image */}
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-4 bg-gray-900">
                {hitOfTheDay.card.imageUrlScryfall || hitOfTheDay.card.imageUrlGatherer ? (
                  <img
                    src={hitOfTheDay.card.imageUrlScryfall || hitOfTheDay.card.imageUrlGatherer}
                    alt={hitOfTheDay.card.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-gray-700" />
                  </div>
                )}
              </div>

              {/* Card info */}
              <div className="text-center">
                <h3 className="text-lg font-bold text-white mb-1">{hitOfTheDay.card.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{hitOfTheDay.card.setName}</p>
                
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-white/[0.06] bg-white/[0.03] ${getRarityColor(hitOfTheDay.card.rarity)}`}>
                    <Flame className="w-3 h-3" />
                    {hitOfTheDay.card.rarity}
                  </span>
                  {hitOfTheDay.cardValue && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-amber-400 border border-amber-500/20 bg-amber-500/5">
                      <Coins className="w-3 h-3" />
                      {Number(hitOfTheDay.cardValue).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Pulled by */}
                <div className="flex items-center justify-center gap-2 pt-3 border-t border-white/[0.06]">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[11px] font-bold text-white">
                    {hitOfTheDay.user.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="text-sm text-gray-400">Pulled by</span>
                  <span className="text-sm font-semibold text-white">{hitOfTheDay.user.name || 'Anonymous'}</span>
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============================================ */}
      {/* FEATURED BOXES */}
      {/* ============================================ */}
      {hasContent ? (
        <>
          {featuredBoxes.length > 0 && (
            <section className="relative container mb-16 sm:mb-20 px-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-2 rounded-full border border-blue-500/20 bg-blue-500/5">
                    <Flame className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs text-blue-400 font-semibold uppercase tracking-wide">Featured Packs</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">Hot Boxes</h2>
                </div>
                <Link 
                  href="/boxes" 
                  className="group inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium touch-target"
                >
                  View All
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {featuredBoxes.map((box) => (
                  <Link 
                    key={box.id} 
                    href={`/open/${box.id}`}
                    className="group rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="aspect-[4/3] relative bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center overflow-hidden">
                      {box.imageUrl ? (
                        <img 
                          src={box.imageUrl} 
                          alt={box.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <Package className="w-16 h-16 text-gray-700" />
                      )}
                      {box.games && box.games[0] && (
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide bg-black/60 backdrop-blur-sm text-white border border-white/[0.1]">
                          {box.games[0].replace(/_/g, ' ')}
                        </div>
                      )}
                    </div>
                    <div className="p-4 sm:p-5">
                      <h3 className="text-base font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                        {box.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-amber-400">
                          <Coins className="w-4 h-4" />
                          <span className="font-bold">{box.price}</span>
                        </div>
                        <span className="text-xs text-gray-600 font-medium">{box._count.cards} cards</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ============================================ */}
          {/* ACTIVE BATTLES */}
          {/* ============================================ */}
          {activeBattles.length > 0 && (
            <section className="relative container mb-16 sm:mb-20 px-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-2 rounded-full border border-green-500/20 bg-green-500/5">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-green-400 font-semibold uppercase tracking-wide">Live Now</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">Active Battles</h2>
                </div>
                <Link 
                  href="/battles" 
                  className="group inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium touch-target"
                >
                  View All
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {activeBattles.map((battle) => (
                  <Link 
                    key={battle.id} 
                    href={`/battles/${battle.id}`}
                    className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] p-5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide ${
                        battle.status === 'WAITING' 
                          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' 
                          : 'bg-green-500/10 text-green-400 border border-green-500/20'
                      }`}>
                        {battle.status === 'WAITING' ? (
                          <>
                            <Clock className="w-3 h-3" />
                            Waiting
                          </>
                        ) : (
                          <>
                            <Zap className="w-3 h-3" />
                            In Progress
                          </>
                        )}
                      </span>
                      <span className="text-xs text-gray-600 font-medium">{battle.maxParticipants} players</span>
                    </div>

                    <h3 className="text-base font-semibold text-white mb-3 group-hover:text-purple-400 transition-colors">
                      {battle.box.name} Battle
                    </h3>

                    {/* Participants */}
                    <div className="flex items-center mb-4">
                      {battle.participants.slice(0, 4).map((p, i) => (
                        <div 
                          key={p.id}
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[11px] font-bold text-white border-2 border-gray-950"
                          style={{ marginLeft: i > 0 ? '-6px' : '0', zIndex: 4 - i }}
                        >
                          {p.user.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      ))}
                      {battle.participants.length > 4 && (
                        <span className="text-xs text-gray-500 ml-2">+{battle.participants.length - 4}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                      <div className="flex items-center gap-1.5 text-amber-400">
                        <Coins className="w-3.5 h-3.5" />
                        <span className="text-sm font-bold">{battle.box.price} entry</span>
                      </div>
                      <span className="text-purple-400 text-xs font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        Join <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        /* Coming Soon */
        <section className="relative container mb-16 sm:mb-20 px-4">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 sm:p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-6 rounded-2xl bg-gradient-to-br from-blue-500/15 to-purple-500/15">
              <Package className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">Coming Soon</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              We&apos;re preparing amazing boxes and battles for you.
              Create an account to be notified when we launch!
            </p>
            <Link 
              href="/register" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 touch-target min-h-[56px]"
            >
              <Sparkles className="w-5 h-5" />
              Get Notified
            </Link>
          </div>
        </section>
      )}

      {/* ============================================ */}
      {/* BOTTOM CTA */}
      {/* ============================================ */}
      <section className="relative container pb-20 sm:pb-28 px-4">
        <div className="text-center">
          <p className="text-xl sm:text-2xl md:text-3xl text-gray-300 mb-2 font-semibold tracking-tight">
            Play. Rumble. Collect.
          </p>
          <p className="text-lg sm:text-xl text-gray-500 mb-8">
            Get the cards. With <span className="text-white font-bold">PACK</span><span className="text-blue-400 font-bold">ATTACK</span>.
          </p>
          <Link 
            href="/boxes" 
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25 active:scale-95 touch-target min-h-[56px] text-base"
          >
            <Zap className="w-5 h-5" />
            Start Now
          </Link>
        </div>
      </section>
    </div>
  );
}
