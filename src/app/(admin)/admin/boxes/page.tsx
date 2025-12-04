import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BoxesClient } from './BoxesClient';

// Force dynamic rendering for real-time updates
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getBoxes() {
  return await prisma.box.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export default async function AdminBoxesPage() {
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

  const boxes = await getBoxes();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="container py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-white">Box Management</h1>
            <p className="text-gray-400">Manage all boxes in your platform</p>
          </div>
          <Button asChild>
            <Link href="/admin/boxes/create">Create New Box</Link>
          </Button>
        </div>

        <BoxesClient boxes={boxes} />
      </div>
    </div>
  );
}

