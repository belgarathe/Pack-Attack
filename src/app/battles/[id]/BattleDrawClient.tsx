'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Coins, Trophy, Swords, Users, ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDate } from '@/lib/date-utils';
import { motion, AnimatePresence } from 'framer-motion';
import { AddBotsControl } from '../components/AddBotsControl';

interface BattleDrawClientProps {
  battle: any;
  currentUserId: string | null;
  isAdmin: boolean;
}

interface PullResult {
  participantId: string;
  participantName: string;
  isBot: boolean;
  card: any;
  coinValue: number;
  roundNumber: number;
}

export default function BattleDrawClient({ battle: initialBattle, currentUserId, isAdmin }: BattleDrawClientProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [battle, setBattle] = useState(initialBattle);
  const [starting, setStarting] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState(0);
  const [allPulls, setAllPulls] = useState<PullResult[]>([]);
  const [participantTotals, setParticipantTotals] = useState<Map<string, number>>(new Map());
  const [currentReveal, setCurrentReveal] = useState<PullResult | null>(null);
  const [isShowingReveal, setIsShowingReveal] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [battleComplete, setBattleComplete] = useState(false);
  
  const revealTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const REVEAL_DURATION = 2000;
  const BETWEEN_PULLS_DELAY = 500;

  const isCreator = currentUserId === battle.creatorId;
  const canStartBattle = (isCreator || isAdmin) && 
                        battle.status === 'WAITING' && 
                        battle.participants.length === battle.maxParticipants;

  const clearRevealTimeouts = () => {
    revealTimeoutsRef.current.forEach(clearTimeout);
    revealTimeoutsRef.current = [];
  };

  const scheduleTimeout = (callback: () => void, delay: number) => {
    const timeoutId = setTimeout(callback, delay);
    revealTimeoutsRef.current.push(timeoutId);
    return timeoutId;
  };

  useEffect(() => {
    return () => {
      clearRevealTimeouts();
    };
  }, []);

  const simulateDraws = async (battleData: any) => {
    const pulls: PullResult[] = [];
    const totals = new Map<string, number>();
    
    // Initialize totals
    battleData.participants.forEach((p: any) => {
      totals.set(p.userId, 0);
    });

    // Simulate pulls for each round and participant
    for (let round = 1; round <= battleData.rounds; round++) {
      for (const participant of battleData.participants) {
        // Simulate multiple cards per round based on cardsPerPack
        for (let cardIndex = 0; cardIndex < battleData.box.cardsPerPack; cardIndex++) {
          // Find the corresponding pull from battle data
          const pullData = battleData.pulls?.find((p: any) => 
            p.participant.userId === participant.userId && 
            p.roundNumber === round
          );
          
          if (pullData) {
            const pull: PullResult = {
              participantId: participant.userId,
              participantName: participant.user?.name || participant.user?.email || 'Unknown',
              isBot: participant.user?.isBot || false,
              card: pullData.pull?.card || null,
              coinValue: pullData.coinValue || 0,
              roundNumber: round,
            };
            pulls.push(pull);
            
            // Update totals
            const currentTotal = totals.get(participant.userId) || 0;
            totals.set(participant.userId, currentTotal + pull.coinValue);
          }
        }
      }
    }

    return { pulls, totals };
  };

  const startBattleWithAnimation = async () => {
    setStarting(true);
    setIsDrawing(true);
    clearRevealTimeouts();
    
    try {
      const response = await fetch(`/api/battles/${battle.id}/start`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start battle');
      }

      // Get the pulls and totals
      const { pulls, totals } = await simulateDraws(data.battle);
      setParticipantTotals(totals);
      
      // Animate each pull
      let timeline = 1000;
      
      pulls.forEach((pull, index) => {
        const isLast = index === pulls.length - 1;
        
        // Show card reveal
        scheduleTimeout(() => {
          setCurrentReveal(pull);
          setIsShowingReveal(true);
          setAllPulls(prev => [...prev, pull]);
          
          // Update current round display
          setCurrentRound(pull.roundNumber);
        }, timeline);
        
        timeline += REVEAL_DURATION;
        
        // Hide reveal and prepare for next
        scheduleTimeout(() => {
          setIsShowingReveal(false);
          setCurrentReveal(null);
          
          if (isLast) {
            // Battle complete - determine and show winner
            setTimeout(() => {
              setWinner(data.battle.winnerId);
              setBattleComplete(true);
              setBattle(data.battle);
              setIsDrawing(false);
              
              addToast({
                title: 'Battle Complete!',
                description: `Winner: ${data.battle.winner?.name || data.battle.winner?.email}`,
              });
            }, 500);
          }
        }, timeline);
        
        timeline += BETWEEN_PULLS_DELAY;
      });
      
    } catch (error) {
      clearRevealTimeouts();
      setIsDrawing(false);
      addToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start battle',
        variant: 'destructive',
      });
    } finally {
      setStarting(false);
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

  const getStatusColor = () => {
    switch (battle.status) {
      case 'WAITING':
        return 'text-yellow-400';
      case 'IN_PROGRESS':
        return 'text-blue-400';
      case 'FINISHED':
        return 'text-green-400';
      case 'CANCELLED':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const participants = battle.participants || [];
  const spotsLeft = Math.max(0, battle.maxParticipants - participants.length);

  // Group pulls by participant
  const pullsByParticipant = allPulls.reduce((acc: any, pull) => {
    if (!acc[pull.participantId]) {
      acc[pull.participantId] = {
        name: pull.participantName,
        isBot: pull.isBot,
        pulls: [],
        total: 0,
      };
    }
    acc[pull.participantId].pulls.push(pull);
    acc[pull.participantId].total += pull.coinValue;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="container py-12">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/battles">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Battles
            </Link>
          </Button>
        </div>

        {/* Winner Announcement */}
        <AnimatePresence>
          {battleComplete && winner && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-8 rounded-lg border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 p-6"
            >
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="h-8 w-8 text-yellow-500" />
                <h2 className="text-2xl font-bold text-yellow-400">Battle Complete!</h2>
              </div>
              <p className="text-lg text-white">
                Winner: <span className="font-bold text-yellow-400">
                  {battle.winner?.name || battle.winner?.email}
                </span>
                {battle.totalPrize > 0 && (
                  <span className="ml-2 text-gray-300">
                    • Prize: {battle.totalPrize} coins
                  </span>
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start Battle Button */}
        {canStartBattle && !battleComplete && (
          <div className="mb-8 rounded-lg border-2 border-green-500/50 bg-gradient-to-br from-green-900/20 to-green-800/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-green-400">Battle Ready!</h3>
                <p className="text-sm text-gray-300">All spots are filled. You can start the battle now.</p>
              </div>
              <Button
                onClick={startBattleWithAnimation}
                disabled={starting || isDrawing}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                {starting ? 'Starting Battle...' : 'Start Battle'}
              </Button>
            </div>
          </div>
        )}

        {/* Current Card Reveal */}
        <AnimatePresence>
          {isShowingReveal && currentReveal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ rotateY: 180 }}
                animate={{ rotateY: 0 }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                <Card className="border-2 border-yellow-500/50 bg-gray-900 p-8 max-w-md">
                  <div className="text-center mb-4">
                    <p className="text-lg text-gray-400">Round {currentReveal.roundNumber}</p>
                    <p className="text-xl font-bold text-white">
                      {currentReveal.participantName}
                      {currentReveal.isBot && (
                        <span className="ml-2 text-sm text-amber-400">(Bot)</span>
                      )}
                    </p>
                  </div>
                  {currentReveal.card && (
                    <div className="space-y-4">
                      <div className="relative h-80 w-60 mx-auto overflow-hidden rounded-lg border border-gray-700">
                        <Image
                          src={currentReveal.card.imageUrlGatherer || currentReveal.card.imageUrlScryfall}
                          alt={currentReveal.card.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-white">{currentReveal.card.name}</p>
                        <p className="text-sm text-gray-400">{currentReveal.card.rarity}</p>
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <Coins className="h-5 w-5 text-yellow-500" />
                          <span className="text-2xl font-bold text-yellow-400">
                            {currentReveal.coinValue}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="absolute -inset-4"
                >
                  <Sparkles className="absolute top-0 left-0 h-8 w-8 text-yellow-400 animate-pulse" />
                  <Sparkles className="absolute top-0 right-0 h-8 w-8 text-yellow-400 animate-pulse" />
                  <Sparkles className="absolute bottom-0 left-0 h-8 w-8 text-yellow-400 animate-pulse" />
                  <Sparkles className="absolute bottom-0 right-0 h-8 w-8 text-yellow-400 animate-pulse" />
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Battle Details Card */}
            <Card className="border-gray-800 bg-gray-900/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">Battle Details</CardTitle>
                  <span className={`text-sm font-semibold uppercase ${getStatusColor()}`}>
                    {battle.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Swords className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Mode:</span>
                    <span className="text-white font-semibold">{getBattleModeLabel()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Players:</span>
                    <span className="text-white font-semibold">
                      {participants.length}/{battle.maxParticipants}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Entry Fee:</span>
                    <span className="text-white font-semibold">{battle.entryFee} coins</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Rounds:</span>
                    <span className="text-white font-semibold">
                      {isDrawing ? `${currentRound}/${battle.rounds}` : battle.rounds}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Participants / Results */}
            <Card className="border-gray-800 bg-gray-900/50">
              <CardHeader>
                <CardTitle>
                  {allPulls.length > 0 ? 'Battle Progress' : 'Participants'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isAdmin && spotsLeft > 0 && !battleComplete && (
                  <div className="mb-6">
                    <AddBotsControl battleId={battle.id} maxAddable={spotsLeft} />
                  </div>
                )}
                <div className="space-y-4">
                  {participants.map((participant: any) => {
                    const pulls = pullsByParticipant[participant.userId];
                    const total = participantTotals.get(participant.userId) || 0;
                    const isWinner = winner === participant.userId;
                    
                    return (
                      <div
                        key={participant.id}
                        className={`rounded-lg border ${
                          isWinner 
                            ? 'border-yellow-500 bg-yellow-900/20' 
                            : 'border-gray-800 bg-gray-900/70'
                        } p-4 transition-all`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">
                              {participant.user?.name || participant.user?.email}
                            </span>
                            {participant.user?.isBot && (
                              <span className="rounded-full border border-amber-600/40 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold uppercase text-amber-200">
                                Bot
                              </span>
                            )}
                            {isWinner && (
                              <Trophy className="h-5 w-5 text-yellow-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {total > 0 && (
                              <>
                                <Coins className="h-4 w-4 text-yellow-500" />
                                <span className="text-lg font-bold text-yellow-400">
                                  {total.toFixed(2)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {pulls && pulls.pulls.length > 0 && (
                          <div className="grid grid-cols-6 gap-1">
                            {pulls.pulls.map((pull: PullResult, index: number) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                className="relative group cursor-pointer"
                                title={`${pull.card?.name || 'Unknown'} - ${pull.coinValue} coins`}
                              >
                                <div className="relative h-20 w-full overflow-hidden rounded border border-gray-700 bg-gray-800">
                                  {pull.card && (
                                    <Image
                                      src={pull.card.imageUrlGatherer || pull.card.imageUrlScryfall}
                                      alt={pull.card.name}
                                      fill
                                      className="object-cover transition-transform group-hover:scale-110"
                                      unoptimized
                                    />
                                  )}
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                                    <p className="text-xs text-yellow-400 font-semibold text-center">
                                      {pull.coinValue}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Box Details Sidebar */}
          <div className="space-y-6">
            <Card className="border-gray-800 bg-gray-900/50">
              <CardHeader>
                <CardTitle>Box Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative h-48 w-full overflow-hidden rounded-lg border border-gray-800">
                  <Image
                    src={battle.box.imageUrl}
                    alt={battle.box.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-center justify-between">
                    <span>Price per box</span>
                    <span className="text-white font-semibold">
                      {battle.box.price.toLocaleString()} coins
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cards per pack</span>
                    <span className="text-white font-semibold">{battle.box.cardsPerPack}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-400">{battle.box.description}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
