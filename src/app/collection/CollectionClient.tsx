'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Coins, ShoppingCart, Trash2, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { emitCoinBalanceUpdate } from '@/lib/coin-events';

type Pull = {
  id: string;
  card: {
    id: string;
    name: string;
    imageUrlGatherer: string;
    coinValue: number;
    rarity: string;
  } | null;
  box: {
    name: string;
  };
  cartItem: { id: string } | null;
};

export function CollectionClient({ pulls }: { pulls: Pull[] }) {
  const { addToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [zoomedCard, setZoomedCard] = useState<Pull | null>(null);

  // Close zoom when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (zoomedCard && (e.target as HTMLElement).classList.contains('zoom-overlay')) {
        setZoomedCard(null);
      }
    };

    if (zoomedCard) {
      document.addEventListener('click', handleClickOutside);
      // Prevent body scroll when zoomed
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [zoomedCard]);

  // Close zoom on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && zoomedCard) {
        setZoomedCard(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [zoomedCard]);

  const handleSell = async (pullId: string, coinValue: number) => {
    setLoading(pullId);
    try {
      const res = await fetch('/api/cards/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pullId }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to sell card',
          variant: 'destructive',
        });
        return;
      }

      addToast({
        title: 'Success',
        description: `Card sold for ${coinValue} coins! Coins have been added to your account.`,
      });

      if (data.newBalance !== undefined) {
        emitCoinBalanceUpdate({ balance: data.newBalance });
      } else {
        emitCoinBalanceUpdate();
      }
      router.refresh();
    } catch (error) {
      console.error('Error selling card:', error);
      addToast({
        title: 'Error',
        description: 'Failed to sell card',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleAddToCart = async (pullId: string) => {
    setLoading(pullId);
    try {
      const res = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pullId }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to add to cart',
          variant: 'destructive',
        });
        return;
      }

      addToast({
        title: 'Success',
        description: 'Card added to cart for checkout!',
      });

      router.refresh();
    } catch (error) {
      console.error('Error adding to cart:', error);
      addToast({
        title: 'Error',
        description: 'Failed to add to cart',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pulls.map((pull) => {
          if (!pull.card) return null;

          return (
            <Card key={pull.id} className="overflow-hidden border-gray-800 bg-gray-900/50 hover:border-primary/50 transition-all">
              <div 
                className="relative aspect-[63/88] w-full cursor-pointer"
                onClick={() => setZoomedCard(pull)}
              >
                <Image
                  src={pull.card.imageUrlGatherer}
                  alt={pull.card.name}
                  fill
                  className="object-cover transition-transform hover:scale-105"
                  unoptimized
                />
                {pull.cartItem && (
                  <div className="absolute top-2 right-2 rounded-full bg-primary px-2 py-1 text-xs font-bold text-white z-10">
                    In Cart
                  </div>
                )}
              </div>
            <CardContent className="p-4">
              <h3 className="mb-2 font-semibold text-white line-clamp-2">{pull.card.name}</h3>
              <p className="mb-2 text-xs text-gray-400">{pull.box.name}</p>
              <div className="mb-4 flex items-center gap-2">
                <Coins className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold text-white">{pull.card.coinValue} coins</span>
              </div>
              <div className="flex gap-2">
                {pull.cartItem ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-primary/20 border-primary/50"
                    disabled
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    In Cart
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleAddToCart(pull.id)}
                    disabled={loading === pull.id}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Checkout
                  </Button>
                )}
                {!pull.cartItem && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleSell(pull.id, pull.card!.coinValue)}
                    disabled={loading === pull.id}
                  >
                    <Coins className="h-4 w-4 mr-1" />
                    Sell
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>

    {/* Zoom Modal */}
    {zoomedCard && zoomedCard.card && (
      <div 
        className="zoom-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setZoomedCard(null);
          }
        }}
      >
        <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center">
          {/* Close Button */}
          <button
            onClick={() => setZoomedCard(null)}
            className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
            aria-label="Close zoom"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Zoomed Card Image */}
          <div className="relative w-full max-w-md aspect-[63/88] mb-4">
            <Image
              src={zoomedCard.card.imageUrlGatherer}
              alt={zoomedCard.card.name}
              fill
              className="object-contain"
              unoptimized
            />
          </div>

          {/* Card Info */}
          <div className="bg-gray-900/95 rounded-lg p-6 w-full max-w-md text-center">
            <h2 className="text-2xl font-bold text-white mb-2">{zoomedCard.card.name}</h2>
            <p className="text-gray-400 mb-4">{zoomedCard.box.name}</p>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Coins className="h-5 w-5 text-yellow-500" />
              <span className="text-xl font-semibold text-white">{zoomedCard.card.coinValue} coins</span>
            </div>
            {zoomedCard.cartItem && (
              <div className="mb-4">
                <span className="inline-block rounded-full bg-primary px-3 py-1 text-sm font-bold text-white">
                  In Cart
                </span>
              </div>
            )}
            <div className="flex gap-2">
              {zoomedCard.cartItem ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-primary/20 border-primary/50"
                  disabled
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  In Cart
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    handleAddToCart(zoomedCard.id);
                    setZoomedCard(null);
                  }}
                  disabled={loading === zoomedCard.id}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Checkout
                </Button>
              )}
              {!zoomedCard.cartItem && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    handleSell(zoomedCard.id, zoomedCard.card!.coinValue);
                    setZoomedCard(null);
                  }}
                  disabled={loading === zoomedCard.id}
                >
                  <Coins className="h-4 w-4 mr-1" />
                  Sell
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

