import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Users, Trophy, Coins } from 'lucide-react';

async function getBattles() {
  return await prisma.battle.findMany({
    include: {
      creator: { select: { id: true, name: true, email: true } },
      box: true,
      participants: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      winner: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

function getBattleModeLabel(mode: string, shareMode: boolean): string {
  if (shareMode) return 'Share Mode';
  if (mode === 'NORMAL') return 'Normal';
  if (mode === 'UPSIDE_DOWN') return 'Upside-Down';
  if (mode === 'JACKPOT') return 'Jackpot';
  return mode;
}

function getStatusLabel(status: string): string {
  if (status === 'WAITING') return 'Waiting...';
  if (status === 'IN_PROGRESS') return 'Live';
  if (status === 'FINISHED') return 'Done';
  return status;
}

export default async function BattlesPage() {
  const session = await getCurrentSession();
  const battles = await getBattles();

  const totalCost = (battle: any) => {
    const packCost = battle.box.price * battle.rounds;
    return battle.entryFee + packCost;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="container py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-white">Box Battles</h1>
            <p className="text-gray-400">
              Compete against other players. Each participant buys the same box. Highest coin value wins!
            </p>
          </div>
          {session && (
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href="/battles/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Battle
              </Link>
            </Button>
          )}
        </div>

        {battles.length === 0 ? (
          <Card className="border-gray-800 bg-gray-900/50">
            <CardContent className="py-12 text-center">
              <p className="text-gray-400">No battles found. Create one to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {battles.map((battle) => {
              const cost = totalCost(battle);
              const modeLabel = getBattleModeLabel(battle.battleMode, battle.shareMode);
              const statusLabel = getStatusLabel(battle.status);
              
              return (
                <Card key={battle.id} className="overflow-hidden border-gray-800 bg-gray-900/50 hover:border-primary/50 transition-all">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-300">
                        {battle.rounds} Round{battle.rounds !== 1 ? 's' : ''}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        battle.status === 'WAITING' ? 'bg-yellow-500/20 text-yellow-500' :
                        battle.status === 'IN_PROGRESS' ? 'bg-green-500/20 text-green-500' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {statusLabel}
                      </span>
                    </div>
                    
                    <div className="mb-3">
                      <h3 className="mb-1 text-lg font-semibold text-white line-clamp-1">{battle.box.name}</h3>
                      <p className="text-sm text-gray-400">{modeLabel}</p>
                    </div>

                    <div className="mb-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Players:</span>
                        <span className="text-white">
                          {battle.participants.length}/{battle.maxParticipants}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Battle Price:</span>
                        <div className="flex items-center gap-1">
                          <Coins className="h-3 w-3 text-yellow-500" />
                          <span className="font-semibold text-white">{cost.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/battles/${battle.id}`}>View Battle</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

