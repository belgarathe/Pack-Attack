'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Package, Coins, RefreshCw } from 'lucide-react';

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500';
      case 'CANCELLED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const calculateTotalValue = (participantId: string) => {
    return battle.pulls
      ?.filter((p: any) => p.participantId === participantId)
      ?.reduce((sum: number, p: any) => sum + (p.pull?.cardValue || 0), 0) || 0;
  };

  const getWinnerDisplay = () => {
    if (!battle.winner) return 'No winner';
    const winnerParticipant = battle.participants.find((p: any) => p.userId === battle.winnerId);
    return winnerParticipant?.user?.name || 'Unknown';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <Card className="p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Battle #{battle.id.slice(-6)}</h1>
            <div className="flex gap-2">
              <Badge className={`${getStatusColor(battle.status)} text-white`}>
                {battle.status}
              </Badge>
              <Badge variant="outline">{battle.mode}</Badge>
              {battle.shareRewards && <Badge variant="secondary">Rewards Shared</Badge>}
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Box</p>
              <p className="font-semibold">{battle.box?.name || 'Unknown Box'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Entry Fee</p>
              <p className="font-semibold">{battle.entryFee} coins</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Players</p>
              <p className="font-semibold">
                {battle.participants.length}/{battle.maxParticipants}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Winner</p>
              <p className="font-semibold">{getWinnerDisplay()}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Results */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Battle Results</h2>
        
        {/* Participants and their pulls */}
        <div className="space-y-6">
          {battle.participants.map((participant: any) => {
            const totalValue = calculateTotalValue(participant.id);
            const isWinner = participant.userId === battle.winnerId;
            const pulls = battle.pulls?.filter((p: any) => p.participantId === participant.id) || [];

            return (
              <div key={participant.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">
                      {participant.user?.name || 'Unknown Player'}
                    </span>
                    {participant.user?.isBot && (
                      <Badge variant="secondary">Bot</Badge>
                    )}
                    {isWinner && (
                      <Badge className="bg-yellow-500 text-white">
                        <Trophy className="w-3 h-3 mr-1" />
                        Winner
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-xl font-bold">{totalValue.toFixed(2)} coins</p>
                  </div>
                </div>

                {/* Show pulls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {pulls.map((pull: any, index: number) => (
                    <div key={pull.id} className="bg-secondary rounded p-3">
                      <p className="text-xs text-muted-foreground mb-1">
                        Round {pull.roundNumber}
                      </p>
                      {pull.pull?.card ? (
                        <>
                          <p className="font-semibold text-sm">
                            {pull.pull.card.name}
                          </p>
                          <p className="text-sm text-primary">
                            {pull.pull.cardValue?.toFixed(2)} coins
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No card data</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Battle Summary */}
        {battle.status === 'COMPLETED' && (
          <div className="mt-6 p-4 bg-secondary rounded">
            <h3 className="font-semibold mb-2">Battle Summary</h3>
            <div className="text-sm space-y-1">
              <p>Mode: <span className="font-semibold">{battle.mode}</span></p>
              <p>Total Rounds: <span className="font-semibold">{battle.rounds}</span></p>
              <p>Started: <span className="font-semibold">
                {new Date(battle.createdAt).toLocaleString()}
              </span></p>
              <p>Ended: <span className="font-semibold">
                {new Date(battle.endedAt || battle.updatedAt).toLocaleString()}
              </span></p>
            </div>
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <Button onClick={() => router.push('/battles')} variant="outline">
          Back to Battles
        </Button>
        {currentUserId && (
          <Button onClick={() => router.push('/battles/create')}>
            Create New Battle
          </Button>
        )}
      </div>
    </div>
  );
}