import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UsersClient } from './UsersClient';
import Link from 'next/link';
import { Users, ArrowLeft } from 'lucide-react';

export default async function AdminUsersPage() {
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

  // Get initial users for SSR
  const initialUsers = await prisma.user.findMany({
    where: { isBot: false },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      coins: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          pulls: true,
          battlesCreated: true,
          battleParticipants: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const totalUsers = await prisma.user.count({ where: { isBot: false } });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />

      <div className="relative container py-12">
        {/* Back Link */}
        <Link href="/admin" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Admin
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full glass text-sm">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-gray-300">User Management</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="text-white">Manage </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Users</span>
          </h1>
          <p className="text-gray-400 text-lg">View, edit, and manage user accounts</p>
        </div>

        <UsersClient 
          initialUsers={initialUsers} 
          totalUsers={totalUsers}
        />
      </div>
    </div>
  );
}







