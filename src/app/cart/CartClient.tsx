'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Coins, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

type CartItem = {
  id: string;
  pull: {
    id: string;
    card: {
      id: string;
      name: string;
      imageUrlGatherer: string;
      coinValue: number;
    } | null;
  };
};

export function CartClient({ items, total }: { items: CartItem[]; total: number }) {
  const { addToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleRemove = async (pullId: string) => {
    setLoading(pullId);
    try {
      const res = await fetch('/api/cart/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pullId }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to remove item',
          variant: 'destructive',
        });
        return;
      }

      addToast({
        title: 'Success',
        description: 'Item removed from cart',
      });

      router.refresh();
    } catch (error) {
      console.error('Error removing item:', error);
      addToast({
        title: 'Error',
        description: 'Failed to remove item',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        {items.map((item) => {
          if (!item.pull.card) return null;

          return (
            <Card key={item.id} className="border-gray-800 bg-gray-900/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-36 rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={item.pull.card.imageUrlGatherer}
                      alt={item.pull.card.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-2">{item.pull.card.name}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <Coins className="h-4 w-4 text-yellow-500" />
                      <span className="font-semibold text-white">{item.pull.card.coinValue} coins</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemove(item.pull.id)}
                      disabled={loading === item.pull.id}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="lg:col-span-1">
        <Card className="border-gray-800 bg-gray-900/50 sticky top-4">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total Value:</span>
                <span className="text-2xl font-bold text-white">{total} coins</span>
              </div>
              <div className="text-sm text-gray-400">
                Shipping costs will be calculated at checkout
              </div>
              <Button className="w-full" size="lg">
                Proceed to Checkout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

