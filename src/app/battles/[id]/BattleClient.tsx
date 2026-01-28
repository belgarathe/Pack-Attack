'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Trophy, Users, Package, Coins, RefreshCw, ArrowLeft, Swords, Crown, Calendar } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface BattleClientProps {
  battle: any;
  currentUserId: string | null;
  isAdmin: boolean;
}

export default function BattleClient({ battle, currentUserId, isAdmin }: BattleClientProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const calculateTotalValue = (participantId: string) => {
    return battle.pulls
      ?.filter((p: any) => p.participantId === participantId)
      ?.reduce((sum: number, p: any) => sum + (p.pull?.cardValue || 0), 0) || 0;
  };

  const getWinnerDisplay = () => {
    if (!battle.winner) return 'No winner';
    return battle.winner?.name || battle.winner?.email || 'Unknown';
  };

  const getStatusBadge = () => {
    switch (battle.status) {
      case 'FINISHED':
      case 'COMPLETED':
        return <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-semibold">Completed</span>;
      case 'CANCELLED':
        return <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-semibold">Cancelled</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-sm font-semibold">{battle.status}</span>;
    }
  };

  const getBattleModeLabel = () => {
    if (battle.shareMode) return 'Share Mode';
    switch (battle.battleMode) {
      case 'UPSIDE_DOWN':
        return 'Lowest Wins';
      case 'JACKPOT':
        return 'Jackpot';
      default:
        return 'Highest Wins';
    }
  };

  // Group pulls by round for round-by-round display
  const pullsByRound: Map<number, any[]> = new Map();
  battle.pulls?.forEach((pull: any) => {
    const round = pull.roundNumber;
    if (!pullsByRound.has(round)) {
      pullsByRound.set(round, []);
    }
    pullsByRound.get(round)?.push(pull);
  });

  // Determine round winners
  const roundWinners = Array.from(pullsByRound.entries()).map(([round, pulls]) => {
    const isUpsideDown = battle.battleMode === 'UPSIDE_DOWN';
    let winner = pulls[0];
    
    for (const pull of pulls) {
      const pullValue = pull.pull?.cardValue || 0;
      const winnerValue = winner.pull?.cardValue || 0;
      
      if (isUpsideDown) {
        if (pullValue < winnerValue) winner = pull;
      } else {
        if (pullValue > winnerValue) winner = pull;
      }
    }
    
    return {
      round,
      winner,
      winnerName: winner.participant?.user?.name || winner.participant?.user?.email || 'Unknown',
      card: winner.pull?.card,
      value: winner.pull?.cardValue || 0,
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 radial-gradient pointer-events-none" />

      <div className="relative container py-12">
        {/* Back Button */}
        <div className="mb-8 flex items-center justify-between">
          <Link 
            href="/battles"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Battles
          </Link>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Winner Banner */}
        {battle.winner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="relative overflow-hidden rounded-3xl border border-yellow-500/30 bg-gradient-to-br from-yellow-900/30 via-amber-900/20 to-orange-900/30 p-8">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-transparent" />
              <div className="relative flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 shadow-lg shadow-yellow-500/30">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-1">Battle Complete!</h2>
                  <p className="text-xl text-gray-300">
                    Winner: <span className="font-bold text-yellow-400">{getWinnerDisplay()}</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Battle Info Card */}
            <div className="glass-strong rounded-3xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Battle #{battle.id.slice(-6)}</h1>
                {getStatusBadge()}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Swords className="w-4 h-4" />
                    <span className="text-sm">Mode</span>
                  </div>
                  <p className="text-white font-semibold">{getBattleModeLabel()}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Players</span>
                  </div>
                  <p className="text-white font-semibold">{battle.participants.length}/{battle.maxParticipants}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Coins className="w-4 h-4" />
                    <span className="text-sm">Entry Fee</span>
                  </div>
                  <p className="text-white font-semibold">{battle.entryFee} coins</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Package className="w-4 h-4" />
                    <span className="text-sm">Rounds</span>
                  </div>
                  <p className="text-white font-semibold">{battle.rounds}</p>
                </div>
              </div>
            </div>

            {/* Participants & Results */}
            <div className="glass-strong rounded-3xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-6">Battle Results</h2>
              
              <div className="space-y-4">
                {/* Filter out bots for non-admin users */}
                {(isAdmin ? battle.participants : battle.participants.filter((p: any) => !p.user?.isBot)).map((participant: any) => {
                  const totalValue = calculateTotalValue(participant.id);
                  const isWinner = participant.userId === battle.winnerId;
                  const pulls = battle.pulls?.filter((p: any) => p.participantId === participant.id) || [];
                  
                  return (
                    <motion.div
                      key={participant.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-2xl border p-5 transition-all ${
                        isWinner 
                          ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-900/30 to-amber-900/20' 
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-white">
                            {participant.user?.name || participant.user?.email || 'Unknown'}
                          </span>
                          {isAdmin && participant.user?.isBot && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold">
                              Bot
                            </span>
                          )}
                          {isWinner && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-semibold">
                              <Trophy className="w-3 h-3" />
                              Winner
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Coins className="w-5 h-5 text-yellow-400" />
                          <span className="text-xl font-bold text-yellow-400">
                            {totalValue.toFixed(0)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Card Grid with Images */}
                      {pulls.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                          {pulls.map((pull: any, index: number) => (
                            <motion.div
                              key={pull.id || index}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.05 }}
                              className="group relative"
                            >
                              <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/20 bg-gray-800 shadow-lg group-hover:shadow-xl transition-shadow">
                                {pull.pull?.card ? (
                                  <>
                                    <Image
                                      src={pull.pull.card.imageUrlGatherer || pull.pull.card.imageUrlScryfall || '/placeholder-card.png'}
                                      alt={pull.pull.card.name}
                                      fill
                                      className="object-cover transition-transform group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-2">
                                      <p className="text-xs text-white font-medium truncate">{pull.pull.card.name}</p>
                                      <div className="flex items-center gap-1 mt-1">
                                        <Coins className="w-3 h-3 text-yellow-400" />
                                        <span className="text-sm font-bold text-yellow-400">
                                          {(pull.pull.cardValue || 0).toFixed(0)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-purple-500/80 text-white text-xs font-semibold">
                                      R{pull.roundNumber}
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                                    No card
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Round Winners */}
            {roundWinners.length > 0 && (
              <div className="glass-strong rounded-3xl p-6 border border-white/10">
                <h2 className="text-xl font-bold text-white mb-6">Round Winners</h2>
                <div className="space-y-3">
                  {roundWinners.map((round) => (
                    <div
                      key={round.round}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          {round.round}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{round.winnerName}</p>
                          <p className="text-gray-400 text-sm">{round.card?.name || 'Unknown Card'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {round.card && (
                          <div className="relative w-12 h-16 rounded-lg overflow-hidden border border-white/20 hidden sm:block">
                            <Image
                              src={round.card.imageUrlGatherer || round.card.imageUrlScryfall || '/placeholder-card.png'}
                              alt={round.card.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-yellow-400 font-bold">
                          <Coins className="w-4 h-4" />
                          {round.value.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Battle Timeline */}
            <div className="glass-strong rounded-3xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-6">Battle Summary</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-300">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <span>Created: {new Date(battle.createdAt).toLocaleString()}</span>
                </div>
                {battle.endedAt && (
                  <div className="flex items-center gap-3 text-gray-300">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span>Ended: {new Date(battle.endedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Box Details - Fanned Card Style */}
            <div className="glass rounded-xl overflow-hidden card-lift border border-white/10">
              {/* Card Preview Section - Fanned Cards */}
              <div className="relative h-48 bg-gradient-to-b from-gray-800/50 to-gray-900/80 flex items-end justify-center pb-2 overflow-hidden">
                {/* Background glow effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 via-transparent to-transparent" />
                
                {/* Fanned Cards Display */}
                {battle.box?.cards && battle.box.cards.length > 0 ? (
                  <div className="relative h-40 w-full flex items-center justify-center">
                    {battle.box.cards.slice(0, 3).map((card: any, index: number) => {
                      const rotations = [-15, 0, 15];
                      const translations = [-20, 0, 20];
                      const zIndexes = [1, 3, 2];
                      return (
                        <div
                          key={card.id || index}
                          className="absolute transition-transform duration-300 hover:scale-105"
                          style={{
                            transform: `rotate(${rotations[index]}deg) translateX(${translations[index]}px)`,
                            zIndex: zIndexes[index],
                          }}
                        >
                          <div className="relative w-20 h-[110px] rounded-md overflow-hidden border-2 border-gray-600 shadow-lg hover:border-amber-400/50 transition-colors bg-gray-800">
                            {card.imageUrlGatherer || card.imageUrlScryfall ? (
                              <Image
                                src={card.imageUrlGatherer || card.imageUrlScryfall}
                                alt={card.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-700">
                                <span className="text-[8px] text-gray-500">?</span>
                              </div>
                            )}
                            {/* Value badge on top card */}
                            {index === 1 && card.coinValue && (
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
                ) : battle.box?.imageUrl ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={battle.box.imageUrl}
                      alt={battle.box.name}
                      fill
                      className="object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="w-12 h-12 text-gray-600" />
                  </div>
                )}

                {/* Game Badge */}
                {battle.box?.games && battle.box.games[0] && (
                  <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold badge-${battle.box.games[0].toLowerCase()} z-10`}>
                    {battle.box.games[0]}
                  </div>
                )}
              </div>

              {/* Box Info */}
              <div className="p-4 border-t border-gray-800">
                <h3 className="text-sm font-semibold text-white mb-2 line-clamp-1">
                  {battle.box?.name || 'Unknown Box'}
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-amber-400">{battle.box?.price?.toLocaleString() || 0}</span>
                    <span className="text-xs text-gray-500">coins</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-800/50 flex items-center justify-between text-[11px] text-gray-500">
                  <span>{battle.box?.cardsPerPack || 1} cards/pack</span>
                  <span>{battle.rounds} rounds</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="glass-strong rounded-3xl p-6 border border-white/10">
              <div className="space-y-3">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/battles">View All Battles</Link>
                </Button>
                {currentUserId && (
                  <Button asChild className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                    <Link href="/battles/create">Create New Battle</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
