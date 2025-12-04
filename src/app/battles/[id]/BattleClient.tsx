'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Coins, Trophy, Swords, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { AddBotsControl } from '../components/AddBotsControl';
import { formatDate } from '@/lib/date-utils';

interface BattleClientProps {
  battle: any;
  currentUserId: string | null;
  isAdmin: boolean;
}

export default function BattleClient({ battle: initialBattle, currentUserId, isAdmin }: BattleClientProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [battle, setBattle] = useState(initialBattle);
  const [starting, setStarting] = useState(false);

  const isCreator = currentUserId === battle.creatorId;
  const canStartBattle = (isCreator || isAdmin) && 
                        battle.status === 'WAITING' && 
                        battle.participants.length === battle.maxParticipants;

  const handleStartBattle = async () => {
    setStarting(true);
    try {
      const response = await fetch(`/api/battles/${battle.id}/start`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start battle');
      }

      addToast({
        title: 'Battle Started!',
        description: 'The battle has been completed. Check the results!',
      });

      // Update local battle state
      setBattle(data.battle);
      
      // Refresh the page to show updated results
      router.refresh();
    } catch (error) {
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

  // Group pulls by participant for finished battles
  const participantPulls = battle.status === 'FINISHED' && battle.pulls
    ? battle.pulls.reduce((acc: any, pull: any) => {
        const userId = pull.participant.userId;
        if (!acc[userId]) {
          acc[userId] = {
            user: pull.participant.user,
            pulls: [],
            total: 0,
          };
        }
        acc[userId].pulls.push(pull);
        acc[userId].total += pull.coinValue;
        return acc;
      }, {})
    : {};

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

        {battle.status === 'FINISHED' && battle.winner && (
          <div className="mb-8 rounded-lg border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <h2 className="text-2xl font-bold text-yellow-400">Battle Complete!</h2>
            </div>
            <p className="text-lg text-white">
              Winner: <span className="font-bold text-yellow-400">
                {battle.winner.name || battle.winner.email}
              </span>
              {battle.totalPrize > 0 && (
                <span className="ml-2 text-gray-300">
                  • Prize: {battle.totalPrize} coins
                </span>
              )}
            </p>
          </div>
        )}

        {canStartBattle && (
          <div className="mb-8 rounded-lg border-2 border-green-500/50 bg-gradient-to-br from-green-900/20 to-green-800/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-green-400">Battle Ready!</h3>
                <p className="text-sm text-gray-300">All spots are filled. You can start the battle now.</p>
              </div>
              <Button
                onClick={handleStartBattle}
                disabled={starting}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                {starting ? 'Starting Battle...' : 'Start Battle'}
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
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
                    <span className="text-white font-semibold">{battle.rounds}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {battle.status === 'FINISHED' && Object.keys(participantPulls).length > 0 ? (
              <Card className="border-gray-800 bg-gray-900/50">
                <CardHeader>
                  <CardTitle>Battle Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {Object.entries(participantPulls)
                      .sort((a: any, b: any) => b[1].total - a[1].total)
                      .map(([userId, data]: any) => (
                        <div key={userId} className="border border-gray-800 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-semibold">
                                {data.user.name || data.user.email}
                              </span>
                              {data.user.isBot && (
                                <span className="rounded-full border border-amber-600/40 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold uppercase text-amber-200">
                                  Bot
                                </span>
                              )}
                              {userId === battle.winnerId && (
                                <Trophy className="h-5 w-5 text-yellow-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Coins className="h-4 w-4 text-yellow-500" />
                              <span className="text-lg font-bold text-yellow-400">
                                {data.total.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {data.pulls.map((pull: any, index: number) => (
                              <div
                                key={pull.id}
                                className="relative group cursor-pointer"
                                title={`${pull.itemName} - ${pull.coinValue} coins`}
                              >
                                <div className="relative h-24 w-full overflow-hidden rounded border border-gray-700 bg-gray-800">
                                  {pull.itemImage && (
                                    <Image
                                      src={pull.itemImage}
                                      alt={pull.itemName || 'Card'}
                                      fill
                                      className="object-cover transition-transform group-hover:scale-110"
                                      unoptimized
                                    />
                                  )}
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                                  <p className="text-xs text-yellow-400 font-semibold text-center">
                                    {pull.coinValue}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-gray-800 bg-gray-900/50">
                <CardHeader>
                  <CardTitle>Participants</CardTitle>
                </CardHeader>
                <CardContent>
                  {isAdmin && spotsLeft > 0 && (
                    <div className="mb-6">
                      <AddBotsControl battleId={battle.id} maxAddable={spotsLeft} />
                    </div>
                  )}
                  {participants.length === 0 ? (
                    <p className="text-gray-400">No players have joined yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {participants.map((participant: any) => (
                        <li
                          key={participant.id}
                          className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/70 px-4 py-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-white font-semibold">
                                {participant.user?.name || participant.user?.email || 'Unknown player'}
                              </p>
                              {participant.user?.isBot && (
                                <span className="rounded-full border border-amber-600/40 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold uppercase text-amber-200">
                                  Bot
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              Joined {formatDate(participant.joinedAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            {participant.totalValue > 0 && (
                              <div className="flex items-center gap-1">
                                <Coins className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm font-semibold text-yellow-400">
                                  {participant.totalValue}
                                </span>
                              </div>
                            )}
                            <span className="text-xs text-gray-400">
                              Rounds: {participant.roundsPulled}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

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
