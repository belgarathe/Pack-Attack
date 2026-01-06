import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Plus, Users, Trophy, Coins, Swords, Clock, ChevronRight } from 'lucide-react';

async function getBattles() {
  try {
    return await prisma.battle.findMany({
      include: {
        creator: { select: { id: true, name: true, email: true } },
        box: true,
        participants: {
          include: { user: { select: { id: true, name: true, email: true, isBot: true } } },
        },
        winner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  } catch {
    return [];
  }
}

function getBattleModeLabel(mode: string, shareMode: boolean): string {
  if (shareMode) return 'Share Mode';
  if (mode === 'NORMAL') return 'Normal';
  if (mode === 'UPSIDE_DOWN') return 'Upside-Down';
  if (mode === 'JACKPOT') return 'Jackpot';
  return mode;
}

export default async function BattlesPage() {
  const session = await getCurrentSession();
  const battles = await getBattles();
  const isAdmin = session?.user?.role === 'ADMIN';

  const activeBattles = battles.filter(b => b.status === 'WAITING' || b.status === 'IN_PROGRESS');
  const completedBattles = battles.filter(b => b.status === 'FINISHED');

  const totalCost = (battle: any) => {
    const packCost = battle.box.price * battle.rounds;
    return battle.entryFee + packCost;
  };
  
  // Filter out bot participants for non-admin users
  const getVisibleParticipants = (battle: any) => {
    if (isAdmin) return battle.participants;
    return battle.participants.filter((p: any) => !p.user?.isBot);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />
      
      {/* Purple accent for battles */}
      <div className="fixed top-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl hidden lg:block" />

      <div className="relative container py-12">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full glass text-sm border border-purple-500/20">
              <Swords className="w-4 h-4 text-purple-400" />
              <span className="text-gray-300">PvP Arena</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              <span className="text-white">Box </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Battles</span>
            </h1>
            <p className="text-gray-400 text-lg">
              Compete against other players. Highest coin value wins!
            </p>
          </div>
          {session ? (
            <Link 
              href="/battles/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all hover:scale-105 shimmer"
            >
              <Plus className="w-5 h-5" />
              Create Battle
            </Link>
          ) : (
            <Link 
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white gradient-border bg-gray-900/50 hover:bg-gray-800/50 transition-all"
            >
              Sign In to Create
            </Link>
          )}
        </div>

        {battles.length === 0 ? (
          <div className="glass-strong rounded-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <Swords className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No Battles Found</h2>
            <p className="text-gray-400 mb-6">Be the first to create a battle!</p>
            {session ? (
              <Link 
                href="/battles/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl transition-all hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                Create Battle
              </Link>
            ) : (
              <Link 
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl transition-all hover:scale-105"
              >
                Sign In to Create
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            {/* Active Battles */}
            {activeBattles.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2 h-2 rounded-full bg-green-500 pulse-live" />
                  <h2 className="text-2xl font-bold text-white">Active Battles</h2>
                  <span className="text-sm text-gray-500">({activeBattles.length})</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {activeBattles.map((battle) => {
                    const cost = totalCost(battle);
                    const modeLabel = getBattleModeLabel(battle.battleMode, battle.shareMode);
                    
                    return (
                      <Link 
                        key={battle.id} 
                        href={`/battles/${battle.id}`}
                        className="group glass rounded-2xl p-5 card-lift"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-medium text-gray-300">
                            {battle.rounds} Round{battle.rounds !== 1 ? 's' : ''}
                          </span>
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
                                Live
                              </>
                            )}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors line-clamp-1">
                          {battle.box.name}
                        </h3>
                        <p className="text-sm text-gray-400 mb-4">{modeLabel}</p>

                        {/* Participants */}
                        <div className="flex items-center gap-2 mb-4">
                          {getVisibleParticipants(battle).slice(0, 4).map((p: any, i: number) => (
                            <div 
                              key={p.id}
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white"
                              style={{ marginLeft: i > 0 ? '-8px' : '0' }}
                            >
                              {p.user.name?.[0] || '?'}
                            </div>
                          ))}
                          <span className="text-sm text-gray-400 ml-2">
                            {battle.participants.length}/{battle.maxParticipants}
                            {battle.status === 'WAITING' && battle.participants.length < battle.maxParticipants && (
                              <span className="ml-1 text-green-400">• Open</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                          <div className="flex items-center gap-1 text-amber-400">
                            <Coins className="w-4 h-4" />
                            <span className="font-semibold">{cost.toFixed(0)}</span>
                          </div>
                          <span className="text-purple-400 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                            View <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Completed Battles */}
            {completedBattles.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h2 className="text-2xl font-bold text-white">Completed</h2>
                  <span className="text-sm text-gray-500">({completedBattles.length})</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {completedBattles.map((battle) => {
                    const cost = totalCost(battle);
                    const modeLabel = getBattleModeLabel(battle.battleMode, battle.shareMode);
                    
                    return (
                      <Link 
                        key={battle.id} 
                        href={`/battles/${battle.id}`}
                        className="group glass rounded-2xl p-5 opacity-80 hover:opacity-100 transition-opacity card-lift"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-medium text-gray-400">
                            {battle.rounds} Round{battle.rounds !== 1 ? 's' : ''}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-700/50 text-gray-400">
                            Finished
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors line-clamp-1">
                          {battle.box.name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">{modeLabel}</p>

                        {battle.winner && (
                          <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            <span className="text-sm text-amber-400 font-medium">
                              {battle.winner.name || 'Winner'}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                          <div className="flex items-center gap-1 text-gray-400">
                            <Users className="w-4 h-4" />
                            <span>{getVisibleParticipants(battle).length} players</span>
                          </div>
                          <span className="text-gray-400 text-sm font-medium group-hover:text-purple-400 group-hover:translate-x-1 transition-all inline-flex items-center gap-1">
                            Results <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
