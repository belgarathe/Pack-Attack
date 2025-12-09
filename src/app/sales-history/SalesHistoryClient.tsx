'use client';

import Image from 'next/image';
import { Coins, Calendar, CheckCircle2 } from 'lucide-react';
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
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {sales.map((sale) => (
        <div
          key={sale.id}
          className="group glass rounded-xl overflow-hidden transition-all"
        >
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
            <div className="absolute top-2 right-2 rounded-full bg-green-500 p-1">
              <CheckCircle2 className="h-3 w-3 text-white" />
            </div>
          </div>
          <div className="p-3">
            <h3 className="font-semibold text-white text-sm truncate mb-2">{sale.cardName}</h3>
            <div className="flex items-center gap-1 mb-2">
              <Coins className="h-3 w-3 text-green-400" />
              <span className="text-sm font-semibold text-green-400">+{sale.coinsReceived} coins</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(sale.timestamp)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
