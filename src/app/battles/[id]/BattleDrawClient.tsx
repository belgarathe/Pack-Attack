'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Coins, Trophy, Swords, Users, ArrowLeft, Sparkles, Crown, Zap, Package, Check, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
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

interface RoundResult {
  roundNumber: number;
  pulls: PullResult[];
  winnerId: string;
  winnerName: string;
  winningCard: any;
  winningValue: number;
}

export default function BattleDrawClient({ battle: initialBattle, currentUserId, isAdmin }: BattleDrawClientProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [battle, setBattle] = useState(initialBattle);
  const [starting, setStarting] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [allPulls, setAllPulls] = useState<PullResult[]>([]);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [participantTotals, setParticipantTotals] = useState<Map<string, number>>(new Map());
  const [currentReveal, setCurrentReveal] = useState<PullResult | null>(null);
  const [isShowingReveal, setIsShowingReveal] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [battleComplete, setBattleComplete] = useState(false);
  const [showingRoundWinner, setShowingRoundWinner] = useState<RoundResult | null>(null);
  const [joining, setJoining] = useState(false);
  const [readyLoading, setReadyLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const revealTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const REVEAL_DURATION = 2000;
  const ROUND_WINNER_DURATION = 1500;
  const BETWEEN_PULLS_DELAY = 300;
  const POLLING_INTERVAL = 2000; // Poll every 2 seconds
  const COUNTDOWN_SECONDS = 3;

  const isCreator = currentUserId === battle.creatorId;
  const isParticipant = battle.participants.some((p: any) => p.userId === currentUserId);
  const myParticipant = battle.participants.find((p: any) => p.userId === currentUserId);
  const amIReady = myParticipant?.isReady ?? false;
  const isBattleFull = battle.participants.length >= battle.maxParticipants;
  const allParticipantsReady = isBattleFull && battle.participants.every((p: any) => p.isReady || p.user?.isBot);
  const humanParticipantsReady = isBattleFull && battle.participants.filter((p: any) => !p.user?.isBot).every((p: any) => p.isReady);
  
  const canJoinBattle = currentUserId && 
                        !isParticipant && 
                        battle.status === 'WAITING' && 
                        battle.participants.length < battle.maxParticipants;
  const canStartBattle = (isCreator || isAdmin) && 
                        battle.status === 'WAITING' && 
                        isBattleFull &&
                        humanParticipantsReady;
  
  // Filter out bots from participants for non-admin users
  const visibleParticipants = isAdmin 
    ? battle.participants 
    : battle.participants.filter((p: any) => !p.user?.isBot);

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
    // Initialize totals to 0 for all participants
    const initialTotals = new Map<string, number>();
    battle.participants.forEach((p: any) => {
      initialTotals.set(p.userId, 0);
    });
    setParticipantTotals(initialTotals);
    
    return () => {
      clearRevealTimeouts();
    };
  }, [battle.participants]);

  // Polling for battle status updates
  const pollBattleStatus = useCallback(async () => {
    if (battleComplete || isDrawing) return;
    
    try {
      const response = await fetch(`/api/battles/${battle.id}/status`);
      if (!response.ok) return;
      
      const data = await response.json();
      if (data.battle) {
        setBattle(data.battle);
        
        // If battle has started (IN_PROGRESS) and we have pulls, start the animation
        if (data.battle.status === 'IN_PROGRESS' && data.battle.pulls?.length > 0 && !isDrawing) {
          // Battle was started by someone else, play the animation
          playBattleAnimation(data.battle);
        }
        
        // If battle is finished, show results
        if (data.battle.status === 'FINISHED' && !battleComplete) {
          setBattleComplete(true);
          setWinner(data.battle.winnerId);
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, [battle.id, battleComplete, isDrawing]);

  // Start polling when waiting for battle
  useEffect(() => {
    if (battle.status === 'WAITING' && !battleComplete) {
      pollingRef.current = setInterval(pollBattleStatus, POLLING_INTERVAL);
    }
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [battle.status, battleComplete, pollBattleStatus]);

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, []);

  const toggleReady = async () => {
    if (!currentUserId || !isParticipant || readyLoading) return;
    
    setReadyLoading(true);
    try {
      const method = amIReady ? 'DELETE' : 'POST';
      const response = await fetch(`/api/battles/${battle.id}/ready`, { method });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update ready status');
      }
      
      // Update local battle state
      setBattle((prev: any) => ({
        ...prev,
        participants: prev.participants.map((p: any) => 
          p.userId === currentUserId ? { ...p, isReady: !amIReady } : p
        ),
      }));
      
      addToast({
        title: amIReady ? 'Unreadied' : 'Ready!',
        description: amIReady ? 'You are no longer ready' : 'Waiting for other players...',
      });
      
    } catch (error) {
      addToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update ready status',
        variant: 'destructive',
      });
    } finally {
      setReadyLoading(false);
    }
  };

  const playBattleAnimation = (battleData: any) => {
    setIsDrawing(true);
    clearRevealTimeouts();
    setAllPulls([]);
    setRoundResults([]);
    
    // Stop polling during animation
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    
    // Reset totals to 0
    const initialTotals = new Map<string, number>();
    battleData.participants.forEach((p: any) => {
      initialTotals.set(p.userId, 0);
    });
    setParticipantTotals(initialTotals);
    
    const pullsByRound = prepareDrawData(battleData);
    const isUpsideDown = battleData.battleMode === 'UPSIDE_DOWN';
    
    let timeline = 500;
    
    // Process each round
    for (let round = 1; round <= battleData.rounds; round++) {
      const roundPulls = pullsByRound.get(round) || [];
      
      // Reveal each pull in the round
      roundPulls.forEach((pull, index) => {
        scheduleTimeout(() => {
          setCurrentReveal(pull);
          setIsShowingReveal(true);
          setAllPulls(prev => [...prev, pull]);
          setCurrentRound(round);
          
          // Update total for this participant when card is revealed
          setParticipantTotals(prev => {
            const newTotals = new Map(prev);
            const currentTotal = newTotals.get(pull.participantId) || 0;
            newTotals.set(pull.participantId, currentTotal + pull.coinValue);
            return newTotals;
          });
        }, timeline);
        
        timeline += REVEAL_DURATION;
        
        scheduleTimeout(() => {
          setIsShowingReveal(false);
          setCurrentReveal(null);
        }, timeline);
        
        timeline += BETWEEN_PULLS_DELAY;
      });
      
      // Show round winner after all pulls in round
      const roundResult = determineRoundWinner(roundPulls, isUpsideDown);
      
      scheduleTimeout(() => {
        setRoundResults(prev => [...prev, roundResult]);
        setShowingRoundWinner(roundResult);
      }, timeline);
      
      timeline += ROUND_WINNER_DURATION;
      
      scheduleTimeout(() => {
        setShowingRoundWinner(null);
      }, timeline);
      
      timeline += 500;
    }
    
    // Battle complete
    scheduleTimeout(() => {
      setWinner(battleData.winnerId);
      setBattleComplete(true);
      setBattle(battleData);
      setIsDrawing(false);
      
      addToast({
        title: 'Battle Complete! 🏆',
        description: `Winner: ${battleData.winner?.name || battleData.winner?.email}`,
      });
    }, timeline);
  };

  const prepareDrawData = (battleData: any) => {
    const pullsByRound: Map<number, PullResult[]> = new Map();
    
    // Group pulls by round
    for (let round = 1; round <= battleData.rounds; round++) {
      const roundPulls: PullResult[] = [];
      
      for (const participant of battleData.participants) {
        const pullData = battleData.pulls?.find((p: any) => 
          p.participant.userId === participant.userId && 
          p.roundNumber === round
        );
        
        if (pullData) {
          roundPulls.push({
            participantId: participant.userId,
            participantName: participant.user?.name || participant.user?.email || 'Unknown',
            isBot: participant.user?.isBot || false,
            card: pullData.pull?.card || null,
            coinValue: pullData.coinValue || 0,
            roundNumber: round,
          });
        }
      }
      
      pullsByRound.set(round, roundPulls);
    }
    
    return pullsByRound;
  };

  const determineRoundWinner = (roundPulls: PullResult[], isUpsideDown: boolean): RoundResult => {
    let winner = roundPulls[0];
    
    for (const pull of roundPulls) {
      if (isUpsideDown) {
        // Lowest value wins
        if (pull.coinValue < winner.coinValue) {
          winner = pull;
        }
      } else {
        // Highest value wins
        if (pull.coinValue > winner.coinValue) {
          winner = pull;
        }
      }
    }
    
    return {
      roundNumber: roundPulls[0]?.roundNumber || 0,
      pulls: roundPulls,
      winnerId: winner.participantId,
      winnerName: winner.participantName,
      winningCard: winner.card,
      winningValue: winner.coinValue,
    };
  };

  const startBattleWithAnimation = async () => {
    if (!humanParticipantsReady) {
      addToast({
        title: 'Not Ready',
        description: 'All participants must be ready before starting',
        variant: 'destructive',
      });
      return;
    }
    
    setStarting(true);
    
    // Stop polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    
    // Start countdown
    setCountdown(COUNTDOWN_SECONDS);
    
    const runCountdown = (count: number) => {
      if (count > 0) {
        setCountdown(count);
        countdownRef.current = setTimeout(() => runCountdown(count - 1), 1000);
      } else {
        setCountdown(null);
        executeBattleStart();
      }
    };
    
    runCountdown(COUNTDOWN_SECONDS);
  };
  
  const executeBattleStart = async () => {
    setIsDrawing(true);
    clearRevealTimeouts();
    setAllPulls([]);
    setRoundResults([]);
    
    // Reset totals to 0
    const initialTotals = new Map<string, number>();
    battle.participants.forEach((p: any) => {
      initialTotals.set(p.userId, 0);
    });
    setParticipantTotals(initialTotals);
    
    try {
      const response = await fetch(`/api/battles/${battle.id}/start`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start battle');
      }

      playBattleAnimation(data.battle);
      
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

  const joinBattle = async () => {
    if (!currentUserId || joining) return;
    
    setJoining(true);
    try {
      const response = await fetch(`/api/battles/${battle.id}/join`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join battle');
      }

      setBattle(data.battle);
      addToast({
        title: 'Joined Battle! 🎮',
        description: `${data.coinsDeducted} coins deducted. New balance: ${data.newBalance} coins`,
      });
      
      // Refresh the page to update all state
      router.refresh();
    } catch (error) {
      addToast({
        title: 'Failed to Join',
        description: error instanceof Error ? error.message : 'Could not join the battle',
        variant: 'destructive',
      });
    } finally {
      setJoining(false);
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

  const getStatusBadge = () => {
    switch (battle.status) {
      case 'WAITING':
        return <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-semibold">Waiting</span>;
      case 'IN_PROGRESS':
        return <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-semibold">In Progress</span>;
      case 'FINISHED':
        return <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-semibold">Finished</span>;
      case 'CANCELLED':
        return <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-semibold">Cancelled</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-sm font-semibold">{battle.status}</span>;
    }
  };

  const participants = battle.participants || [];
  const displayParticipants = isAdmin ? participants : participants.filter((p: any) => !p.user?.isBot);
  const spotsLeft = Math.max(0, battle.maxParticipants - participants.length);

  // Group pulls by participant for display
  const pullsByParticipant = allPulls.reduce((acc: any, pull) => {
    if (!acc[pull.participantId]) {
      acc[pull.participantId] = [];
    }
    acc[pull.participantId].push(pull);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 radial-gradient pointer-events-none" />

      <div className="relative container py-12">
        {/* Back Button */}
        <div className="mb-8">
          <Link 
            href="/battles"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Battles
          </Link>
        </div>

        {/* Winner Announcement */}
        <AnimatePresence>
          {battleComplete && winner && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
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
                      Winner: <span className="font-bold text-yellow-400">{battle.winner?.name || battle.winner?.email}</span>
                      {battle.totalPrize > 0 && (
                        <span className="ml-3 text-gray-400">• Prize: <span className="text-yellow-400">{battle.totalPrize} coins</span></span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Countdown Overlay */}
        <AnimatePresence>
          {countdown !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
            >
              <motion.div
                key={countdown}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [0.8, 1.1, 1] }}
                  transition={{ duration: 0.5 }}
                  className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-yellow-400"
                >
                  {countdown === 0 ? 'GO!' : countdown}
                </motion.div>
                <p className="text-2xl text-gray-400 mt-4">Battle starting...</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ready Up Section - For participants who need to ready up */}
        {isParticipant && isBattleFull && battle.status === 'WAITING' && !battleComplete && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className={`rounded-3xl border p-6 ${
              amIReady 
                ? 'border-green-500/30 bg-gradient-to-br from-green-900/30 to-emerald-900/20' 
                : 'border-yellow-500/30 bg-gradient-to-br from-yellow-900/30 to-orange-900/20'
            }`}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${
                    amIReady 
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                      : 'bg-gradient-to-br from-yellow-500 to-orange-600'
                  }`}>
                    {amIReady ? <Check className="w-6 h-6 text-white" /> : <Clock className="w-6 h-6 text-white" />}
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${amIReady ? 'text-green-400' : 'text-yellow-400'}`}>
                      {amIReady ? "You're Ready!" : 'Ready Up!'}
                    </h3>
                    <p className="text-gray-400">
                      {humanParticipantsReady 
                        ? 'All players ready! Waiting for battle to start...' 
                        : `Waiting for ${battle.participants.filter((p: any) => !p.isReady && !p.user?.isBot).length} player(s) to ready up`
                      }
                    </p>
                  </div>
                </div>
                <Button
                  onClick={toggleReady}
                  disabled={readyLoading}
                  size="lg"
                  className={amIReady 
                    ? 'bg-gray-600 hover:bg-gray-700 text-white font-bold px-8' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold px-8'
                  }
                >
                  {readyLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : amIReady ? (
                    'Cancel Ready'
                  ) : (
                    "I'm Ready!"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Start Battle Button - Only for creator/admin when all are ready */}
        {canStartBattle && !battleComplete && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="rounded-3xl border border-green-500/30 bg-gradient-to-br from-green-900/30 to-emerald-900/20 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-400">All Players Ready!</h3>
                    <p className="text-gray-400">Everyone is ready. Start the battle now!</p>
                  </div>
                </div>
                <Button
                  onClick={startBattleWithAnimation}
                  disabled={starting || isDrawing}
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold px-8"
                >
                  {starting ? 'Starting...' : 'Start Battle'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Join Battle Section - For users who haven't joined yet */}
        {canJoinBattle && !battleComplete && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-900/30 to-pink-900/20 p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-purple-400">Join this Battle!</h3>
                    <p className="text-gray-400">
                      {battle.participants.length}/{battle.maxParticipants} spots filled • 
                      Cost: <span className="text-yellow-400 font-semibold">{battle.entryFee + (battle.box?.price || 0) * battle.rounds} coins</span>
                    </p>
                  </div>
                </div>
                <Button
                  onClick={joinBattle}
                  disabled={joining}
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold px-8"
                >
                  {joining ? 'Joining...' : 'Join Battle'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Current Card Reveal Modal */}
        <AnimatePresence>
          {isShowingReveal && currentReveal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.5, rotateY: 180 }}
                animate={{ scale: 1, rotateY: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', duration: 0.6 }}
                className="relative"
              >
                <div className="relative rounded-3xl border-2 border-purple-500/50 bg-gray-900/95 p-8 max-w-sm shadow-2xl shadow-purple-500/20">
                  {/* Header */}
                  <div className="text-center mb-6">
                    <p className="text-purple-400 font-semibold mb-1">Round {currentReveal.roundNumber}</p>
                    <p className="text-2xl font-bold text-white">
                      {currentReveal.participantName}
                      {isAdmin && currentReveal.isBot && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">Bot</span>
                      )}
                    </p>
                  </div>
                  
                  {/* Card Image */}
                  {currentReveal.card && (
                    <div className="space-y-4">
                      <div className="relative h-80 w-56 mx-auto overflow-hidden rounded-xl border-2 border-gray-700 shadow-xl">
                        <Image
                          src={currentReveal.card.imageUrlGatherer || currentReveal.card.imageUrlScryfall}
                          alt={currentReveal.card.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-white mb-1">{currentReveal.card.name}</p>
                        <p className="text-gray-400 text-sm mb-3">{currentReveal.card.rarity}</p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/30">
                          <Coins className="w-5 h-5 text-yellow-400" />
                          <span className="text-2xl font-bold text-yellow-400">{currentReveal.coinValue}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Sparkle Effects */}
                <Sparkles className="absolute -top-4 -left-4 w-8 h-8 text-purple-400 animate-pulse" />
                <Sparkles className="absolute -top-4 -right-4 w-8 h-8 text-purple-400 animate-pulse" />
                <Sparkles className="absolute -bottom-4 -left-4 w-8 h-8 text-yellow-400 animate-pulse" />
                <Sparkles className="absolute -bottom-4 -right-4 w-8 h-8 text-yellow-400 animate-pulse" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Round Winner Announcement */}
        <AnimatePresence>
          {showingRoundWinner && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="rounded-3xl border border-green-500/50 bg-gray-900/95 p-8 max-w-md text-center shadow-2xl"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-4">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <p className="text-green-400 font-semibold mb-2">Round {showingRoundWinner.roundNumber} Winner</p>
                <p className="text-2xl font-bold text-white mb-4">{showingRoundWinner.winnerName}</p>
                {showingRoundWinner.winningCard && (
                  <div className="flex items-center justify-center gap-3 text-gray-300">
                    <span>{showingRoundWinner.winningCard.name}</span>
                    <span className="text-yellow-400 font-bold">{showingRoundWinner.winningValue} coins</span>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  <p className="text-white font-semibold">{participants.length}/{battle.maxParticipants}</p>
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
                  <p className="text-white font-semibold">
                    {isDrawing ? `${currentRound}/${battle.rounds}` : battle.rounds}
                  </p>
                </div>
              </div>
            </div>

            {/* Participants */}
            <div className="glass-strong rounded-3xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-6">
                {allPulls.length > 0 ? 'Battle Progress' : 'Participants'}
              </h2>
              
              {isAdmin && spotsLeft > 0 && !battleComplete && (
                <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                  <AddBotsControl battleId={battle.id} maxAddable={spotsLeft} />
                </div>
              )}
              
              <div className="space-y-4">
                {displayParticipants.map((participant: any) => {
                  const pulls = pullsByParticipant[participant.userId] || [];
                  const total = participantTotals.get(participant.userId) || 0;
                  const isWinner = winner === participant.userId;
                  
                  return (
                    <motion.div
                      key={participant.id}
                      layout
                      className={`rounded-2xl border p-5 transition-all ${
                        isWinner 
                          ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-900/30 to-amber-900/20' 
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-white">
                            {participant.user?.name || participant.user?.email}
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
                          {/* Ready Status - Show when battle is waiting and full */}
                          {battle.status === 'WAITING' && isBattleFull && !participant.user?.isBot && (
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              participant.isReady 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {participant.isReady ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  Ready
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3" />
                                  Waiting
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Coins className="w-5 h-5 text-yellow-400" />
                          <motion.span 
                            key={total}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className="text-xl font-bold text-yellow-400"
                          >
                            {total.toFixed(0)}
                          </motion.span>
                        </div>
                      </div>
                      
                      {pulls.length > 0 && (
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                          {pulls.map((pull: PullResult, index: number) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.05 }}
                              className="group relative cursor-pointer"
                              title={`${pull.card?.name || 'Unknown'} - ${pull.coinValue} coins`}
                            >
                              <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-white/20 bg-gray-800">
                                {pull.card && (
                                  <Image
                                    src={pull.card.imageUrlGatherer || pull.card.imageUrlScryfall}
                                    alt={pull.card.name}
                                    fill
                                    className="object-cover transition-transform group-hover:scale-110"
                                    unoptimized
                                  />
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1">
                                  <p className="text-xs text-yellow-400 font-bold text-center">
                                    {pull.coinValue}
                                  </p>
                                </div>
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

            {/* Round Results */}
            {roundResults.length > 0 && (
              <div className="glass-strong rounded-3xl p-6 border border-white/10">
                <h2 className="text-xl font-bold text-white mb-6">Round Results</h2>
                <div className="space-y-3">
                  {roundResults.map((round) => (
                    <motion.div
                      key={round.roundNumber}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          {round.roundNumber}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{round.winnerName}</p>
                          <p className="text-gray-400 text-sm">{round.winningCard?.name || 'Unknown'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {round.winningCard && (
                          <div className="relative w-12 h-16 rounded overflow-hidden border border-white/20">
                            <Image
                              src={round.winningCard.imageUrlGatherer || round.winningCard.imageUrlScryfall}
                              alt={round.winningCard.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-yellow-400 font-bold">
                          <Coins className="w-4 h-4" />
                          {round.winningValue}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
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
                                unoptimized
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
                      unoptimized
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
