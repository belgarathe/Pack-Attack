import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Package, Trophy, Coins, TrendingUp } from 'lucide-react';

export default async function UserDashboard() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect('/login');
  }

  const stats = {
    pulls: await prisma.pull.count({ where: { userId: user.id } }),
    battles: await prisma.battleParticipant.count({ where: { userId: user.id } }),
    wins: await prisma.battle.count({ where: { winnerId: user.id } }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="container py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold text-white">Welcome back, {user.name || user.email}!</h1>
        <p className="text-gray-400">Manage your collection and join battles</p>
      </div>

      <div className="mb-8">
        <Card className="bg-gradient-to-r from-primary/20 to-secondary/20 border-primary/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-2">Your Balance</p>
                <p className="text-4xl font-bold text-white">{user.coins.toLocaleString()} coins</p>
              </div>
              <Coins className="h-12 w-12 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Package className="h-5 w-5" />
              Total Pulls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.pulls}</div>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Trophy className="h-5 w-5" />
              Battles Joined
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.battles}</div>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5" />
              Battles Won
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.wins}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/battles">Join Battles</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/boxes">Browse Boxes</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/collection">View Collection</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">Active Battles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 mb-4">View your active battles and see results.</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/battles">View All Battles</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}

