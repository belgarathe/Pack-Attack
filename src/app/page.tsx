import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Package, Trophy, Users, Swords, Coins, Clock, ChevronRight, Sparkles, Star, Flame, Zap, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

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

export const revalidate = 60;

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

async function getHitOfTheDay() {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pull = await prisma.pull.findFirst({
      where: { timestamp: { gte: yesterday }, cardValue: { not: null }, card: { isNot: null } },
      orderBy: { cardValue: 'desc' },
      include: { card: true, user: { select: { id: true, name: true } } },
    });
    if (!pull || !pull.card) {
      return await prisma.pull.findFirst({
        where: { cardValue: { not: null }, card: { isNot: null } },
        orderBy: { cardValue: 'desc' },
        include: { card: true, user: { select: { id: true, name: true } } },
      });
    }
    return pull;
  } catch {
    return null;
  }
}

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

async function getActiveBattles() {
  try {
    const battles = await prisma.battle.findMany({
      where: { status: { in: ['WAITING', 'IN_PROGRESS'] } },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        box: true,
        participants: { include: { user: { select: { id: true, name: true } } } },
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

function getRarityStyle(rarity: string) {
  const r = rarity.toLowerCase();
  if (r.includes('mythic') || r.includes('secret') || r.includes('legendary'))
    return { text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30', glow: 'shadow-[0_0_80px_20px_rgba(245,158,11,0.15)]' };
  if (r.includes('rare') || r.includes('ultra'))
    return { text: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-500/30', glow: 'shadow-[0_0_80px_20px_rgba(56,189,248,0.15)]' };
  if (r.includes('epic') || r.includes('holo'))
    return { text: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-500/30', glow: 'shadow-[0_0_80px_20px_rgba(139,92,246,0.15)]' };
  if (r.includes('uncommon') || r.includes('super'))
    return { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', glow: 'shadow-[0_0_80px_20px_rgba(16,185,129,0.12)]' };
  return { text: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', glow: '' };
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
    <div className="min-h-screen font-display overflow-x-hidden">
      {/* ===== Background ===== */}
      <div className="fixed inset-0 bg-[#050810]" />
      <div className="fixed inset-0 bg-grid opacity-[0.04]" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/[0.07] rounded-full blur-[120px]" />
      <div className="fixed bottom-0 left-1/4 w-[600px] h-[400px] bg-purple-600/[0.05] rounded-full blur-[100px]" />

      {/* ═══════════════════════════════════════════
          HERO - Full viewport, dramatic, clean
          ═══════════════════════════════════════════ */}
      <section className="relative min-h-[85vh] sm:min-h-[90vh] flex flex-col items-center justify-center text-center px-4">
        {/* Animated glow behind title */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-r from-blue-500/20 via-purple-500/15 to-pink-500/20 rounded-full blur-[100px] animate-pulse" />

        <div className="relative">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-10 rounded-full border border-white/10 bg-white/[0.03]">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[11px] sm:text-xs text-gray-400 font-medium tracking-[0.2em] uppercase">The Ultimate TCG Experience</span>
          </div>

          {/* Headline */}
          <h1 className="font-heading text-6xl sm:text-7xl md:text-[9rem] lg:text-[12rem] font-black leading-[0.85] tracking-[-0.04em] mb-8">
            <span className="block text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]">PACK</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 drop-shadow-[0_0_80px_rgba(139,92,246,0.3)]">
              ATTACK
            </span>
          </h1>

          {/* Tagline */}
          <p className="font-heading text-xl sm:text-2xl md:text-3xl text-white/80 font-bold tracking-tight mb-4">
            Play. Rumble. Collect.
          </p>
          <p className="max-w-md mx-auto text-sm sm:text-base text-gray-500 mb-12 leading-relaxed">
            Open trading card packs, battle other players, and win real cards shipped to your door.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/boxes"
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold rounded-2xl transition-all duration-300 hover:shadow-[0_8px_40px_rgba(99,102,241,0.4)] hover:scale-[1.03] active:scale-[0.97] text-base overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-violet-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Package className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Get a Pack!</span>
              <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/battles"
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-white/80 hover:text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] text-base"
            >
              <Swords className="w-5 h-5" />
              <span>View Battles</span>
            </Link>
          </div>
        </div>

        {/* Stats - inline below hero */}
        <div className="relative mt-20 sm:mt-24 flex flex-wrap items-center justify-center gap-8 sm:gap-12 md:gap-16">
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-black text-white tabular-nums">{stats.boxesOpened.toLocaleString()}</div>
            <div className="text-[11px] sm:text-xs text-gray-500 mt-1 font-medium tracking-wide uppercase">Packs Opened</div>
          </div>
          <div className="w-px h-10 bg-white/10 hidden sm:block" />
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-black text-white tabular-nums">{stats.battlesRun.toLocaleString()}</div>
            <div className="text-[11px] sm:text-xs text-gray-500 mt-1 font-medium tracking-wide uppercase">Battles</div>
          </div>
          <div className="w-px h-10 bg-white/10 hidden sm:block" />
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-black text-white tabular-nums">{stats.usersOnline.toLocaleString()}</div>
            <div className="text-[11px] sm:text-xs text-gray-500 mt-1 font-medium tracking-wide uppercase">Players</div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          HIT OF THE DAY
          ═══════════════════════════════════════════ */}
      {hitOfTheDay && hitOfTheDay.card && (() => {
        const rs = getRarityStyle(hitOfTheDay.card.rarity);
        return (
          <section className="relative py-24 sm:py-32 px-4">
            <div className="max-w-5xl mx-auto">
              {/* Section label */}
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full border border-amber-500/20 bg-amber-500/[0.04]">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-xs text-amber-400 font-bold tracking-[0.15em] uppercase">Hit of the Day</span>
                </div>
                <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white">Today&apos;s Best Pull</h2>
              </div>

              {/* Card display - centered, dramatic */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-16">
                {/* Card image with glow */}
                <div className={`relative shrink-0 ${rs.glow}`}>
                  <div className={`relative w-[240px] sm:w-[280px] rounded-2xl overflow-hidden border ${rs.border} bg-gray-900/50`}>
                    {hitOfTheDay.card.imageUrlScryfall || hitOfTheDay.card.imageUrlGatherer ? (
                      <img
                        src={hitOfTheDay.card.imageUrlScryfall || hitOfTheDay.card.imageUrlGatherer}
                        alt={hitOfTheDay.card.name}
                        className="w-full h-auto"
                      />
                    ) : (
                      <div className="aspect-[3/4] flex items-center justify-center">
                        <Package className="w-16 h-16 text-gray-700" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Card details */}
                <div className="text-center md:text-left">
                  <h3 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-2">{hitOfTheDay.card.name}</h3>
                  <p className="text-gray-500 mb-5">{hitOfTheDay.card.setName}</p>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${rs.text} ${rs.bg} border ${rs.border}`}>
                      <Sparkles className="w-3 h-3" />
                      {hitOfTheDay.card.rarity}
                    </span>
                    {hitOfTheDay.cardValue && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20">
                        <Coins className="w-3 h-3" />
                        {Number(hitOfTheDay.cardValue).toFixed(2)} coins
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-violet-500/30">
                      {hitOfTheDay.user.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Pulled by</p>
                      <p className="text-sm font-bold text-white flex items-center gap-1.5">
                        {hitOfTheDay.user.name || 'Anonymous'}
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ═══════════════════════════════════════════
          FEATURED BOXES
          ═══════════════════════════════════════════ */}
      {hasContent ? (
        <>
          {featuredBoxes.length > 0 && (
            <section className="relative py-20 sm:py-28 px-4">
              <div className="max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-10 gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-3 rounded-full border border-blue-500/20 bg-blue-500/[0.04]">
                      <Flame className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs text-blue-400 font-bold tracking-[0.15em] uppercase">Featured</span>
                    </div>
                    <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white">Hot Boxes</h2>
                  </div>
                  <Link
                    href="/boxes"
                    className="group inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors font-medium"
                  >
                    View All
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                  {featuredBoxes.map((box) => (
                    <Link
                      key={box.id}
                      href={`/open/${box.id}`}
                      className="group relative rounded-2xl overflow-hidden bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.15] transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(59,130,246,0.15)] hover:-translate-y-1"
                    >
                      {/* Image */}
                      <div className="aspect-[4/3] relative bg-gray-950 overflow-hidden">
                        {box.imageUrl ? (
                          <img
                            src={box.imageUrl}
                            alt={box.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-950">
                            <Package className="w-12 h-12 text-gray-800" />
                          </div>
                        )}
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        {/* Game badge */}
                        {box.games && box.games[0] && (
                          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-black/50 backdrop-blur-md text-white/80 border border-white/10">
                            {box.games[0].replace(/_/g, ' ')}
                          </div>
                        )}
                        {/* Price overlay */}
                        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-md border border-amber-500/20">
                          <Coins className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-sm font-bold text-amber-300">{box.price}</span>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-5">
                        <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors mb-1">
                          {box.name}
                        </h3>
                        <p className="text-xs text-gray-600">{box._count.cards} cards in pack</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════
              ACTIVE BATTLES
              ═══════════════════════════════════════════ */}
          {activeBattles.length > 0 && (
            <section className="relative py-20 sm:py-28 px-4">
              <div className="max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-10 gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-3 rounded-full border border-emerald-500/20 bg-emerald-500/[0.04]">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs text-emerald-400 font-bold tracking-[0.15em] uppercase">Live Now</span>
                    </div>
                    <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white">Active Battles</h2>
                  </div>
                  <Link
                    href="/battles"
                    className="group inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors font-medium"
                  >
                    View All
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                  {activeBattles.map((battle) => (
                    <Link
                      key={battle.id}
                      href={`/battles/${battle.id}`}
                      className="group relative rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/30 p-6 transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(139,92,246,0.12)] hover:-translate-y-1"
                    >
                      {/* Accent bar */}
                      <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${battle.status === 'WAITING' ? 'bg-amber-500' : 'bg-emerald-500'}`} />

                      <div className="flex items-center justify-between mb-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          battle.status === 'WAITING'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        }`}>
                          {battle.status === 'WAITING' ? (
                            <><Clock className="w-3 h-3" /> Waiting</>
                          ) : (
                            <><Zap className="w-3 h-3" /> Live</>
                          )}
                        </span>
                        <span className="text-[11px] text-gray-600 font-medium">{battle.participants.length}/{battle.maxParticipants}</span>
                      </div>

                      <h3 className="text-lg font-bold text-white mb-4 group-hover:text-violet-400 transition-colors">
                        {battle.box.name}
                      </h3>

                      {/* Participants */}
                      <div className="flex items-center mb-5">
                        {battle.participants.slice(0, 5).map((p, i) => (
                          <div
                            key={p.id}
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-[11px] font-bold text-white ring-2 ring-[#050810]"
                            style={{ marginLeft: i > 0 ? '-8px' : '0', zIndex: 5 - i }}
                          >
                            {p.user.name?.[0]?.toUpperCase() || '?'}
                          </div>
                        ))}
                        {battle.maxParticipants - battle.participants.length > 0 && (
                          <div
                            className="w-8 h-8 rounded-full bg-white/[0.04] border border-dashed border-white/10 flex items-center justify-center text-[10px] text-gray-500 ring-2 ring-[#050810]"
                            style={{ marginLeft: '-8px' }}
                          >
                            +{battle.maxParticipants - battle.participants.length}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
                        <div className="flex items-center gap-1.5 text-amber-300">
                          <Coins className="w-3.5 h-3.5" />
                          <span className="text-sm font-bold">{battle.box.price}</span>
                          <span className="text-xs text-gray-600">entry</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-400 group-hover:text-violet-300 transition-colors">
                          Join
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="relative py-24 sm:py-32 px-4">
          <div className="max-w-lg mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-8 rounded-3xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-white/[0.06]">
              <Package className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4">Coming Soon</h2>
            <p className="text-gray-500 mb-10">
              We&apos;re preparing amazing boxes and battles for you.
              Create an account to be notified when we launch!
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_40px_rgba(99,102,241,0.3)] active:scale-95"
            >
              <Sparkles className="w-5 h-5" />
              Get Notified
            </Link>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          BOTTOM CTA
          ═══════════════════════════════════════════ */}
      <section className="relative py-24 sm:py-32 px-4">
        <div className="max-w-3xl mx-auto text-center">
          {/* Decorative line */}
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto mb-12" />

          <p className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-white/90 mb-3 tracking-tight">
            Play. Rumble. Collect.
          </p>
          <p className="text-base sm:text-lg text-gray-500 mb-10">
            Get the cards. With{' '}
            <span className="font-black text-white">PACK</span>
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">ATTACK</span>.
          </p>
          <Link
            href="/boxes"
            className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold rounded-2xl transition-all duration-300 hover:shadow-[0_8px_40px_rgba(99,102,241,0.4)] hover:scale-[1.03] active:scale-[0.97] text-base"
          >
            <Zap className="w-5 h-5" />
            Start Now
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
}
