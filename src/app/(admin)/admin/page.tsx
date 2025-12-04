import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function AdminDashboard() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const stats = {
    boxes: await prisma.box.count(),
    battles: await prisma.battle.count(),
    users: await prisma.user.count(),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="container py-12">
        <h1 className="mb-8 text-4xl font-bold text-white">Admin Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">Total Boxes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.boxes}</div>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">Total Battles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.battles}</div>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.users}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">Box Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 mb-4">Create and manage boxes for users to open.</p>
            <Button asChild>
              <Link href="/admin/boxes">Manage Boxes</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">Battle Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 mb-4">View and manage battles.</p>
            <Button asChild variant="outline">
              <Link href="/battles">View Battles</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}

