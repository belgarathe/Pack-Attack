import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Trophy, Users, TrendingUp } from 'lucide-react';
import { prisma } from '@/lib/prisma';

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

export default async function HomePage() {
  const stats = await getStats();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Hero Section */}
      <section className="container py-20 text-center">
        <h1 className="mb-6 text-6xl font-bold text-white md:text-8xl">
          Magic: The Gathering
        </h1>
        <h2 className="mb-8 text-3xl font-semibold text-gray-300 md:text-4xl">
          boxes, win real cards
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-xl text-gray-400">
          Experience the thrill of Pack Attack, where every case opened is a chance to win items shipped directly to you. 
          Jump into battles, earn rewards, and engage with a community of players.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
            <Link href="/register">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/battles">View Battles</Link>
          </Button>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container py-12">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-gray-800 bg-gray-900/50">
            <CardContent className="p-6 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-primary" />
              <div className="text-4xl font-bold text-white">{stats.boxesOpened.toLocaleString()}</div>
              <div className="mt-2 text-sm text-gray-400">Boxes Opened</div>
            </CardContent>
          </Card>
          <Card className="border-gray-800 bg-gray-900/50">
            <CardContent className="p-6 text-center">
              <Trophy className="mx-auto mb-4 h-12 w-12 text-yellow-500" />
              <div className="text-4xl font-bold text-white">{stats.battlesRun.toLocaleString()}</div>
              <div className="mt-2 text-sm text-gray-400">Battles Run</div>
            </CardContent>
          </Card>
          <Card className="border-gray-800 bg-gray-900/50">
            <CardContent className="p-6 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-green-500" />
              <div className="text-4xl font-bold text-white">{stats.usersOnline.toLocaleString()}</div>
              <div className="mt-2 text-sm text-gray-400">Users Online</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Popular Boxes */}
      <section className="container py-12">
        <h2 className="mb-8 text-3xl font-bold text-white">Popular Boxes</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden border-gray-800 bg-gray-900/50">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20" />
              <CardContent className="p-6">
                <h3 className="mb-2 text-xl font-semibold text-white">Featured Box {i}</h3>
                <p className="mb-4 text-sm text-gray-400">Discover amazing cards in this featured box.</p>
                <Button asChild className="w-full">
                  <Link href="/boxes">View Box</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Active Battles Preview */}
      <section className="container py-12">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-3xl font-bold text-white">Active Battles</h2>
          <Button asChild variant="outline">
            <Link href="/battles">View All</Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-gray-800 bg-gray-900/50">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-gray-400">{i} Rounds</span>
                  <span className="rounded-full bg-yellow-500/20 px-2 py-1 text-xs text-yellow-500">
                    Waiting...
                  </span>
                </div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-lg font-semibold text-white">Battle #{i}</span>
                  <span className="text-sm text-gray-400">Join for Coin0.{i}0</span>
                </div>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/battles">View Battle</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
