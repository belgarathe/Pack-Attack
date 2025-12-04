import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Coins, Package } from 'lucide-react';

async function getBoxes() {
  return await prisma.box.findMany({
    where: { isActive: true },
    orderBy: [
      { featured: 'desc' },
      { popularity: 'desc' },
      { createdAt: 'desc' },
    ],
  });
}

export default async function BoxesPage() {
  const boxes = await getBoxes();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="container py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-white">All Boxes</h1>
          <p className="text-gray-400">Browse and purchase boxes to open</p>
        </div>

        {boxes.length === 0 ? (
          <Card className="border-gray-800 bg-gray-900/50">
            <CardContent className="py-12 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-gray-600" />
              <p className="text-gray-400 mb-4">No boxes available yet.</p>
              <p className="text-sm text-gray-500">Check back soon for new boxes!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boxes.map((box) => (
              <Card key={box.id} className="group overflow-hidden border-gray-800 bg-gray-900/50 hover:border-primary/50 transition-all">
                <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
                  <Image
                    src={box.imageUrl}
                    alt={box.name}
                    fill
                    className="object-cover transition-transform group-hover:scale-110"
                    unoptimized
                  />
                  {box.featured && (
                    <div className="absolute top-2 right-2 rounded-full bg-primary px-2 py-1 text-xs font-bold text-white">
                      Featured
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="mb-2 text-lg font-semibold text-white line-clamp-2">{box.name}</h3>
                  <p className="mb-4 line-clamp-2 text-sm text-gray-400">{box.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-yellow-500" />
                      <span className="font-bold text-white">{box.price.toLocaleString()}</span>
                      <span className="text-sm text-gray-400">coins</span>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/open/${box.id}`}>Open Box</Link>
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {box.cardsPerPack} cards per pack
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

