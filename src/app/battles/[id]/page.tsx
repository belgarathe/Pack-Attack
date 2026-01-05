import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';
import BattleClient from './BattleClient';
import BattleDrawClient from './BattleDrawClient';

async function getBattle(id: string) {
  const battle = await prisma.battle.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true, isBot: true } },
        },
      },
      box: {
        include: {
          cards: {
            orderBy: { coinValue: 'desc' },
            take: 3,
            select: {
              id: true,
              name: true,
              imageUrlGatherer: true,
              imageUrlScryfall: true,
              coinValue: true,
            }
          }
        }
      },
      winner: { select: { id: true, name: true, email: true } },
      pulls: {
        include: {
          participant: {
            include: { user: true },
          },
          pull: {
            include: { card: true },
          },
        },
        orderBy: [
          { roundNumber: 'asc' },
          { pulledAt: 'asc' },
        ],
      },
    },
  });

  if (!battle) return null;

  // Convert Decimal values to plain numbers for serialization
  const serializedBattle = {
    ...battle,
    pulls: battle.pulls?.map(pull => ({
      ...pull,
      pull: pull.pull ? {
        ...pull.pull,
        cardValue: pull.pull.cardValue ? Number(pull.pull.cardValue) : null,
        card: pull.pull.card ? {
          ...pull.pull.card,
          pullRate: Number(pull.pull.card.pullRate),
        } : null,
      } : null,
    })),
  };

  return serializedBattle;
}

export default async function BattleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const battle = await getBattle(id);

  if (!battle) {
    notFound();
  }

  const session = await getCurrentSession();
  const currentUserId = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      }).then(user => user?.id || null)
    : null;

  const isAdmin = session?.user?.role === 'ADMIN';

  // Use BattleDrawClient for animated experience on waiting battles
  // Use BattleClient for already finished battles to show results immediately
  if (battle.status === 'WAITING' || battle.status === 'IN_PROGRESS') {
    return (
      <BattleDrawClient 
        battle={battle} 
        currentUserId={currentUserId} 
        isAdmin={isAdmin} 
      />
    );
  }
  
  return (
    <BattleClient 
      battle={battle} 
      currentUserId={currentUserId} 
      isAdmin={isAdmin} 
    />
  );
}