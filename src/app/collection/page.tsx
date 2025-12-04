import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CollectionClient } from './CollectionClient';

async function getCollection() {
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

  const pulls = await prisma.pull.findMany({
    where: {
      userId: user.id,
      cartItem: null, // Exclude cards that are in cart
    },
    include: {
      card: {
        select: {
          id: true,
          name: true,
          imageUrlGatherer: true,
          coinValue: true,
          rarity: true,
        },
      },
      box: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { timestamp: 'desc' },
  });

  // Get cart items separately to check if pulls are in cart
  let cart;
  try {
    cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          select: { pullId: true },
        },
      },
    });
  } catch (error) {
    // Cart table might not exist yet, ignore
    cart = null;
  }

  const cartPullIds = new Set(cart?.items.map(item => item.pullId) || []);
  
  // Add cartItem info to pulls
  return pulls.map(pull => ({
    id: pull.id,
    card: pull.card
      ? {
          id: pull.card.id,
          name: pull.card.name,
          imageUrlGatherer: pull.card.imageUrlGatherer,
          coinValue: pull.card.coinValue,
          rarity: pull.card.rarity,
        }
      : null,
    box: pull.box,
    cartItem: cartPullIds.has(pull.id) ? { id: 'temp' } : null,
  }));
}

export default async function CollectionPage() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const pullsWithCart = await getCollection();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="container py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-white">My Collection</h1>
          <p className="text-gray-400">Manage your card collection</p>
        </div>

        {pullsWithCart.length === 0 ? (
          <Card className="border-gray-800 bg-gray-900/50">
            <CardContent className="py-12 text-center">
              <p className="text-gray-400">Your collection is empty. Open some boxes to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <CollectionClient pulls={pullsWithCart} />
        )}
      </div>
    </div>
  );
}
