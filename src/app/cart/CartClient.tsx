'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Coins, Trash2, CreditCard, Truck } from 'lucide-react';
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
      {/* Items List */}
      <div className="lg:col-span-2 space-y-4">
        {items.map((item) => {
          if (!item.pull.card) return null;

          return (
            <div key={item.id} className="glass rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-36 rounded-xl overflow-hidden flex-shrink-0">
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
                    <Coins className="h-4 w-4 text-amber-400" />
                    <span className="font-semibold text-amber-400">{item.pull.card.coinValue} coins</span>
                  </div>
                  <button
                    onClick={() => handleRemove(item.pull.id)}
                    disabled={loading === item.pull.id}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Checkout Sidebar */}
      <div className="lg:col-span-1">
        <div className="glass-strong rounded-2xl p-6 sticky top-4">
          <h3 className="text-lg font-bold text-white mb-4">Order Summary</h3>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Items ({items.length})</span>
              <span className="text-white">{total} coins</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Shipping</span>
              <span className="text-white">5,00 €</span>
            </div>
            <div className="h-px bg-gray-700" />
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Value</span>
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-400" />
                <span className="text-2xl font-bold text-white">{total}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => router.push('/checkout')}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <CreditCard className="h-5 w-5" />
              Proceed to Checkout
            </button>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Truck className="h-4 w-4" />
              <span>Real cards shipped to you</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
