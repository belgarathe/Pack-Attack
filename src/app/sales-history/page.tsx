import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SalesHistoryClient } from './SalesHistoryClient';

async function getSalesHistory() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    return [];
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return [];
  }

  const sales = await prisma.saleHistory.findMany({
    where: { userId: user.id },
    orderBy: { timestamp: 'desc' },
  });

  return sales;
}

export default async function SalesHistoryPage() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const sales = await getSalesHistory();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="container py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-white">Sales History</h1>
          <p className="text-gray-400">View all cards you've sold back to the shop</p>
        </div>

        {sales.length === 0 ? (
          <Card className="border-gray-800 bg-gray-900/50">
            <CardContent className="py-12 text-center">
              <p className="text-gray-400">You haven't sold any cards yet.</p>
            </CardContent>
          </Card>
        ) : (
          <SalesHistoryClient sales={sales} />
        )}
      </div>
    </div>
  );
}

