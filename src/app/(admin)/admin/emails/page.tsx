import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EmailsClient } from './EmailsClient';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';

export default async function AdminEmailsPage() {
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

  // Get initial emails and stats
  const [emails, totalEmails, stats, typeStats] = await Promise.all([
    prisma.emailLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { sentAt: 'desc' },
      take: 50,
    }),
    prisma.emailLog.count(),
    prisma.emailLog.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.emailLog.groupBy({
      by: ['type'],
      _count: true,
    }),
  ]);

  // Get list of users for email sending
  const users = await prisma.user.findMany({
    where: { isBot: false },
    select: {
      id: true,
      email: true,
      name: true,
    },
    orderBy: { email: 'asc' },
  });

  const initialStats = {
    byStatus: stats.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {} as Record<string, number>),
    byType: typeStats.reduce((acc, t) => ({ ...acc, [t.type]: t._count }), {} as Record<string, number>),
  };

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
            <Mail className="w-4 h-4 text-pink-400" />
            <span className="text-gray-300">Email Management</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="text-white">Email </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400">Management</span>
          </h1>
          <p className="text-gray-400 text-lg">Send emails and view email history</p>
        </div>

        <EmailsClient 
          initialEmails={emails}
          totalEmails={totalEmails}
          initialStats={initialStats}
          users={users}
        />
      </div>
    </div>
  );
}


