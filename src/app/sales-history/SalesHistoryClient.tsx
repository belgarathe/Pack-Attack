'use client';

import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { Coins, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type Sale = {
  id: string;
  cardId: string | null;
  cardName: string;
  cardImage: string | null;
  coinsReceived: number;
  timestamp: Date;
};

export function SalesHistoryClient({ sales }: { sales: Sale[] }) {
  const totalCoins = sales.reduce((sum, sale) => sum + sale.coinsReceived, 0);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-gray-800 bg-gray-900/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Total Cards Sold</p>
              <p className="text-2xl font-bold text-white">{sales.length}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400 mb-1">Total Coins Received</p>
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-500" />
                <p className="text-2xl font-bold text-yellow-500">{totalCoins.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sales.map((sale) => (
          <Card key={sale.id} className="overflow-hidden border-gray-800 bg-gray-900/50 hover:border-primary/50 transition-all">
            <div className="relative aspect-[63/88] w-full">
              {sale.cardImage ? (
                <Image
                  src={sale.cardImage}
                  alt={sale.cardName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <span className="text-gray-600 text-xs">No Image</span>
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <h3 className="mb-2 font-semibold text-white line-clamp-2">{sale.cardName}</h3>
              <div className="mb-2 flex items-center gap-2">
                <Coins className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold text-yellow-500">{sale.coinsReceived} coins</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(sale.timestamp)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

