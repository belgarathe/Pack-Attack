'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Coins, Package } from 'lucide-react';
import Image from 'next/image';
import { emitCoinBalanceUpdate } from '@/lib/coin-events';

type BoxCard = {
  id: string;
  name: string;
  imageUrlGatherer: string;
  coinValue: number;
  pullRate: number;
};

type Box = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  cardsPerPack: number;
  cards: BoxCard[];
};

export default function OpenBoxPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const [box, setBox] = useState<Box | null>(null);
  const [opening, setOpening] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [pulls, setPulls] = useState<any[]>([]);
  const [userCoins, setUserCoins] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [openedCardIds, setOpenedCardIds] = useState<Set<string>>(new Set());
  const [spinningCardIds, setSpinningCardIds] = useState<Set<string>>(new Set());
  const [featuredPullId, setFeaturedPullId] = useState<string | null>(null);
  const [featuredCardId, setFeaturedCardId] = useState<string | null>(null);
  const [currentReveal, setCurrentReveal] = useState<any | null>(null);
  const [isShowingReveal, setIsShowingReveal] = useState(false);
  const [currentRevealIndex, setCurrentRevealIndex] = useState(0);
  const [revealTotal, setRevealTotal] = useState(0);
  const revealTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const clearRevealTimeouts = () => {
    revealTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    revealTimeoutsRef.current = [];
    setCurrentReveal(null);
    setIsShowingReveal(false);
    setCurrentRevealIndex(0);
    setRevealTotal(0);
    setSpinningCardIds(new Set());
    setIsAnimating(false);
  };

  const scheduleTimeout = (callback: () => void, delay: number) => {
    const timeoutId = setTimeout(callback, delay);
    revealTimeoutsRef.current.push(timeoutId);
  };

  const startRandomSpin = () => {
    if (!box?.cards?.length) {
      return;
    }
    const randomCardIds = new Set<string>();
    const numToSpin = Math.min(5, box.cards.length);
    const shuffled = [...box.cards].sort(() => Math.random() - 0.5);
    for (let i = 0; i < numToSpin; i++) {
      randomCardIds.add(shuffled[i].id);
    }
    setSpinningCardIds(randomCardIds);
    setIsAnimating(true);
  };

  const stopSpin = () => {
    setIsAnimating(false);
    setSpinningCardIds(new Set());
  };

useEffect(() => {
  fetch(`/api/boxes?id=${params.boxId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.boxes && data.boxes[0]) {
          const boxData = data.boxes[0];
          // Ensure cards array exists and has proper structure
          if (boxData.cards && Array.isArray(boxData.cards)) {
            console.log(`Loaded box with ${boxData.cards.length} cards`);
            setBox(boxData);
          } else {
            console.error('Box has no cards array:', boxData);
            setBox({ ...boxData, cards: [] });
          }
        }
      })
      .catch((error) => {
        console.error('Error fetching box:', error);
      });

    fetch('/api/user/coins')
      .then((res) => res.json())
      .then((data) => {
        if (data.coins !== undefined) {
          setUserCoins(data.coins);
        }
      })
      .catch(console.error);
}, [params.boxId]);

useEffect(() => {
  return () => {
    clearRevealTimeouts();
  };
}, []);

  const handleOpen = async () => {
    if (!box) return;

    const totalCost = box.price * quantity;
    if (userCoins !== null && userCoins < totalCost) {
      addToast({
        title: 'Insufficient Coins',
        description: `You need ${totalCost} coins but only have ${userCoins}`,
        variant: 'destructive',
      });
      return;
    }

    clearRevealTimeouts();
    setOpening(true);
    setOpenedCardIds(new Set());
    setPulls([]);
    setFeaturedPullId(null);
    setFeaturedCardId(null);
    setCurrentReveal(null);
    setIsShowingReveal(false);
    setCurrentRevealIndex(0);
    setRevealTotal(0);
    startRandomSpin();

    try {
      const res = await fetch('/api/packs/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boxId: box.id,
          quantity,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to open box',
          variant: 'destructive',
        });
        setIsAnimating(false);
        setSpinningCardIds(new Set());
        return;
      }

      const pullsData = data.pulls || [];
      const featured = pullsData.reduce((best: any, pull: any) => {
        const bestValue = best?.card?.coinValue ?? -Infinity;
        const currentValue = pull.card?.coinValue ?? -Infinity;
        return currentValue > bestValue ? pull : best;
      }, null);

      setFeaturedPullId(featured?.id ?? null);
      setFeaturedCardId(featured?.card?.id ?? null);
      setUserCoins(data.remainingCoins);
      emitCoinBalanceUpdate({ balance: data.remainingCoins });
      setRevealTotal(pullsData.length);

      if (pullsData.length === 0) {
        stopSpin();
        addToast({
          title: 'Success',
          description: `Opened ${quantity} box${quantity > 1 ? 'es' : ''}!`,
        });
        return;
      }

      const REVEAL_DURATION = 1500;
      const SPINNER_BURST_DURATION = 900;

      scheduleTimeout(() => {
        stopSpin();

        let timeline = 0;

        pullsData.forEach((pull: any, index: number) => {
          const isLast = index === pullsData.length - 1;

          scheduleTimeout(() => {
            stopSpin();
            setCurrentReveal(pull);
            setIsShowingReveal(true);
            setCurrentRevealIndex(index + 1);
            setOpenedCardIds((prev) => {
              const next = new Set(prev);
              if (pull.card?.id) {
                next.add(pull.card.id);
              }
              return next;
            });
            setPulls((prev) => [...prev, pull]);
          }, timeline);

          timeline += REVEAL_DURATION;

          scheduleTimeout(() => {
            setIsShowingReveal(false);
            setCurrentReveal(null);
            if (isLast) {
              stopSpin();
              addToast({
                title: 'Success',
                description: `Opened ${quantity} box${quantity > 1 ? 'es' : ''}!`,
              });
            } else {
              startRandomSpin();
            }
          }, timeline);

          if (!isLast) {
            timeline += SPINNER_BURST_DURATION;
            scheduleTimeout(() => {
              stopSpin();
            }, timeline);
          }
        });
      }, 1500);
    } catch (error) {
      console.error('Error opening box:', error);
      clearRevealTimeouts();
      setIsAnimating(false);
      setSpinningCardIds(new Set());
      addToast({
        title: 'Error',
        description: 'Failed to open box',
        variant: 'destructive',
      });
    } finally {
      setOpening(false);
    }
  };

  if (!box) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-white">Loading box...</div>
      </div>
    );
  }

  // Ensure cards array exists
  if (!box.cards || !Array.isArray(box.cards)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
        <div className="container py-12">
          <Card className="border-gray-800 bg-gray-900/50">
            <CardContent className="py-12 text-center">
              <p className="text-gray-400">This box has no cards yet. Please add cards to the box first.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalCost = box.price * quantity;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="container py-12">
        <div className="max-w-6xl mx-auto">
          <Card className="border-gray-800 bg-gray-900/50 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-2xl">{box.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative w-48 h-64 rounded-lg overflow-hidden">
                  <Image
                    src={box.imageUrl}
                    alt={box.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex-1">
                  <p className="text-gray-400 mb-4">{box.description}</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-yellow-500" />
                      <span className="text-white font-semibold">{box.price} coins per box</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-400">{box.cardsPerPack} cards per pack</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-800 bg-gray-900/50 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Open Box</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Quantity</label>
                  <div className="flex items-center gap-4">
                    {[1, 2, 3, 4].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setQuantity(qty)}
                        className={`px-6 py-3 rounded-lg border-2 transition-all ${
                          quantity === qty
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        {qty}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Total Cost:</span>
                    <span className="text-xl font-bold text-white">{totalCost} coins</span>
                  </div>
                  {userCoins !== null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Your Balance:</span>
                      <span className={userCoins >= totalCost ? 'text-green-500' : 'text-red-500'}>
                        {userCoins} coins
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleOpen}
                  disabled={opening || (userCoins !== null && userCoins < totalCost)}
                  className="w-full"
                  size="lg"
                >
                  {opening ? 'Opening...' : `Open ${quantity}x Box${quantity > 1 ? 'es' : ''}`}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* What's in the box section */}
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="text-white">What's in the box?</CardTitle>
              {box.cards && box.cards.length > 0 && (
                <p className="text-sm text-gray-400 mt-2">
                  {box.cards.length} card{box.cards.length !== 1 ? 's' : ''} available
                </p>
              )}
            </CardHeader>
            <CardContent>
              {box.cards && Array.isArray(box.cards) && box.cards.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {box.cards.map((card) => {
                    const isOpened = openedCardIds.has(card.id);
                    const isSpinning = isAnimating && spinningCardIds.has(card.id);
                    const isFeatured = isOpened && featuredCardId === card.id;

                    return (
                      <div
                        key={card.id}
                        className={`relative group transition-transform ${
                          isOpened
                            ? isFeatured
                              ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-gray-900 z-10'
                              : 'ring-4 ring-yellow-500 ring-offset-2 ring-offset-gray-900 z-10'
                            : ''
                        } ${isFeatured ? 'scale-[1.03]' : ''}`}
                      >
                        <div
                          className={`relative aspect-[63/88] rounded-lg overflow-hidden border-2 transition-all ${
                            isOpened
                              ? isFeatured
                                ? 'border-amber-400 shadow-xl shadow-amber-400/60 scale-110'
                                : 'border-yellow-500 shadow-lg shadow-yellow-500/50 scale-105'
                              : isSpinning
                              ? 'border-primary shadow-lg shadow-primary/50'
                              : 'border-gray-700 hover:border-gray-600'
                          } ${isSpinning ? 'animate-spin-slow' : ''}`}
                          style={isSpinning ? { transformStyle: 'preserve-3d' } : {}}
                        >
                          {card.imageUrlGatherer ? (
                            <Image
                              src={card.imageUrlGatherer}
                              alt={card.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                              <span className="text-gray-600 text-xs">No Image</span>
                            </div>
                          )}
                          {isOpened && (
                            <div
                              className={`absolute inset-0 ${
                                isFeatured ? 'bg-amber-400/25' : 'bg-yellow-500/20'
                              } animate-pulse`}
                            />
                          )}
                          {isFeatured && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-gray-900 shadow-lg">
                              Best Pull
                            </div>
                          )}
                          {/* Coin value overlay on card */}
                          <div className="absolute top-2 left-2 bg-black/80 rounded px-2 py-1 flex items-center gap-1">
                            <Coins className="h-3 w-3 text-yellow-500" />
                            <span className="text-xs font-bold text-yellow-500">
                              {card.coinValue.toLocaleString()}
                            </span>
                          </div>
                          {/* Pull rate overlay on card */}
                          <div className="absolute top-2 right-2 bg-black/80 rounded px-2 py-1">
                            <span className="text-xs font-bold text-white">
                              {card.pullRate.toFixed(3)}%
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 text-center">
                          <p className="text-sm font-semibold text-white truncate" title={card.name}>
                            {card.name}
                          </p>
                          <div className="flex items-center justify-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              <Coins className="h-3 w-3 text-yellow-500" />
                              <span className="text-xs text-yellow-500 font-semibold">
                                {card.coinValue.toLocaleString()}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-400 font-medium">
                              {card.pullRate.toFixed(3)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>No cards available in this box yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {pulls.length > 0 && (
            <Card className="border-gray-800 bg-gray-900/50 mt-6">
              <CardHeader>
                <CardTitle className="text-white">Your Pulls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {pulls.map((pull) => {
                    const isFeatured = pull.id === featuredPullId;
                    return (
                      <div
                        key={pull.id}
                        className={`relative aspect-[63/88] rounded-lg overflow-hidden border-2 ring-4 transition-transform ${
                          isFeatured
                            ? 'border-amber-400 ring-amber-400/60 scale-105 shadow-xl shadow-amber-400/40'
                            : 'border-yellow-500 ring-yellow-500/50'
                        }`}
                      >
                        {pull.card?.imageUrlGatherer && (
                          <Image
                            src={pull.card.imageUrlGatherer}
                            alt={pull.card.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        )}
                        {isFeatured && (
                          <div className="absolute top-2 right-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-gray-900">
                            Best Pull
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2">
                          <p className="text-xs text-white truncate">{pull.card?.name}</p>
                          <p className="text-xs text-yellow-500">{pull.card?.coinValue} coins</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" onClick={() => router.push('/collection')}>
                    View Collection
                  </Button>
                  <Button
                    onClick={() => {
                      clearRevealTimeouts();
                      setPulls([]);
                      setOpenedCardIds(new Set());
                      setFeaturedPullId(null);
                      setFeaturedCardId(null);
                      setCurrentReveal(null);
                      setIsShowingReveal(false);
                      setCurrentRevealIndex(0);
                      setRevealTotal(0);
                    }}
                  >
                    Open More
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {isShowingReveal && currentReveal?.card && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-amber-400 bg-gray-950/90 p-6 text-center shadow-2xl shadow-amber-500/30">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-300">
              Pull {currentRevealIndex} of {revealTotal || quantity}
            </p>
            <div className="relative mx-auto mb-4 aspect-[63/88] w-64 overflow-hidden rounded-xl border-2 border-amber-400 shadow-lg shadow-amber-400/60">
              {currentReveal.card.imageUrlGatherer ? (
                <Image
                  src={currentReveal.card.imageUrlGatherer}
                  alt={currentReveal.card.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-800 text-gray-500">
                  No Image
                </div>
              )}
            </div>
            <h3 className="mb-1 text-2xl font-bold text-white">{currentReveal.card.name}</h3>
            <p className="mb-4 text-sm text-gray-400">{box.name}</p>
            <div className="flex items-center justify-center gap-2 text-yellow-400">
              <Coins className="h-5 w-5" />
              <span className="text-xl font-semibold">{currentReveal.card.coinValue} coins</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
