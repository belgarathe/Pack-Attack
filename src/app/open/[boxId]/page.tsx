'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Coins, Package, Sparkles, ArrowLeft, Layers } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
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
    if (!box?.cards?.length) return;
    const allCardIds = new Set<string>();
    for (let i = 0; i < box.cards.length; i++) {
      if (box.cards[i]?.id) {
        allCardIds.add(box.cards[i].id);
      }
    }
    setSpinningCardIds(new Set(allCardIds));
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
          if (boxData.cards && Array.isArray(boxData.cards)) {
            setBox(boxData);
          } else {
            setBox({ ...boxData, cards: [] });
          }
        }
      })
      .catch(console.error);

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
    return () => clearRevealTimeouts();
  }, []);

  useEffect(() => {
    if (box?.cards && box.cards.length > 0 && isAnimating) {
      const allIds = new Set<string>(box.cards.map(card => card.id));
      setSpinningCardIds(allIds);
    }
  }, [box?.cards, isAnimating]);

  const handleOpen = async () => {
    if (!box) return;

    const totalCost = box.price * quantity;
    if (userCoins !== null && userCoins < totalCost) {
      addToast({
        title: 'Insufficient Coins',
        description: `You need ${totalCost.toFixed(2)} coins but only have ${userCoins.toFixed(2)}`,
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
        body: JSON.stringify({ boxId: box.id, quantity }),
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
        addToast({ title: 'Success', description: `Opened ${quantity} box${quantity > 1 ? 'es' : ''}!` });
        return;
      }

      const numCards = pullsData.length;
      const REVEAL_DURATION = 3000; // Duration each card popup stays on screen (doubled from 1500ms)
      const SPINNER_BURST_DURATION = 900;

      scheduleTimeout(() => {
        let timeline = 0;
        pullsData.forEach((pull: any, index: number) => {
          const isLast = index === pullsData.length - 1;

          scheduleTimeout(() => {
            if (!isAnimating) startRandomSpin();
            setCurrentReveal(pull);
            setIsShowingReveal(true);
            setCurrentRevealIndex(index + 1);
            setOpenedCardIds((prev) => {
              const next = new Set(prev);
              if (pull.card?.id) next.add(pull.card.id);
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
                description: `Opened ${quantity} box${quantity > 1 ? 'es' : ''}! Got ${numCards} card${numCards !== 1 ? 's' : ''}!`,
              });
            }
          }, timeline);

          if (!isLast) timeline += SPINNER_BURST_DURATION;
        });
      }, 1500);
    } catch (error) {
      console.error('Error opening box:', error);
      clearRevealTimeouts();
      setIsAnimating(false);
      setSpinningCardIds(new Set());
      addToast({ title: 'Error', description: 'Failed to open box', variant: 'destructive' });
    } finally {
      setOpening(false);
    }
  };

  if (!box) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 flex items-center justify-center font-display">
        <div className="text-white flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading box...
        </div>
      </div>
    );
  }

  if (!box.cards || !Array.isArray(box.cards)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
        <div className="fixed inset-0 bg-grid opacity-30" />
        <div className="relative container py-12">
          <div className="glass-strong rounded-2xl p-12 text-center">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">This box has no cards yet.</p>
          </div>
        </div>
      </div>
    );
  }

  const totalCost = box.price * quantity;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />
      <div className="fixed top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl hidden lg:block" />

      <div className="relative container py-12">
        {/* Back Link */}
        <Link href="/boxes" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Boxes
        </Link>

        <div className="max-w-6xl mx-auto">
          {/* Box Info Card */}
          <div className="glass-strong rounded-2xl p-6 mb-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="relative w-full md:w-48 aspect-[3/4] rounded-xl overflow-hidden flex-shrink-0">
                {box.imageUrl ? (
                  <Image src={box.imageUrl} alt={box.name} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-600" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full glass text-sm">
                  <Package className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-300">Pack Opening</span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">{box.name}</h1>
                <p className="text-gray-400 mb-4">{box.description}</p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-400" />
                    <span className="text-white font-semibold">{box.price.toFixed(2)} coins/box</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-400">{box.cardsPerPack} cards/pack</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Open Box Card */}
          <div className="glass-strong rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              Open Box
            </h2>
            
            <div className="space-y-4">
              {/* Quantity Selection */}
              <div>
                <label className="block text-sm font-medium mb-3 text-gray-300">Quantity</label>
                <div className="flex flex-wrap gap-3">
                  {[1, 2, 3, 4].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setQuantity(qty)}
                      className={`px-6 py-3 rounded-xl border-2 font-semibold transition-all ${
                        quantity === qty
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {qty}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Cost Display */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Total Cost:</span>
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-400" />
                    <span className="text-2xl font-bold text-white">{totalCost.toFixed(2)}</span>
                  </div>
                </div>
                {userCoins !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Your Balance:</span>
                    <span className={userCoins >= totalCost ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                      {userCoins.toFixed(2)} coins
                    </span>
                  </div>
                )}
              </div>

              {/* Open Button */}
              <button
                onClick={handleOpen}
                disabled={opening || (userCoins !== null && userCoins < totalCost)}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 shimmer"
              >
                {opening ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Opening...
                  </>
                ) : (
                  <>
                    <Package className="w-5 h-5" />
                    Open {quantity}x Box{quantity > 1 ? 'es' : ''}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* What's in the box */}
          <div className="glass-strong rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-2">What's in the box?</h2>
            {box.cards.length > 0 && (
              <p className="text-sm text-gray-400 mb-4">{box.cards.length} card{box.cards.length !== 1 ? 's' : ''} available</p>
            )}
            
            {box.cards.length > 0 ? (
              <div className={`grid gap-4 ${
                box.cards.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' :
                box.cards.length === 2 ? 'grid-cols-2 max-w-lg mx-auto' :
                box.cards.length === 3 ? 'grid-cols-3 max-w-2xl mx-auto' :
                box.cards.length <= 6 ? 'grid-cols-2 sm:grid-cols-3' :
                box.cards.length <= 12 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' :
                'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
              }`}>
                {box.cards.map((card) => {
                  const isOpened = openedCardIds.has(card.id);
                  const isSpinning = isAnimating && spinningCardIds.has(card.id);
                  const isFeatured = isOpened && featuredCardId === card.id;

                  return (
                    <div
                      key={card.id}
                      className={`relative group transition-transform ${
                        isOpened ? (isFeatured ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-gray-900 z-10 scale-[1.03]' : 'ring-4 ring-yellow-500 ring-offset-2 ring-offset-gray-900 z-10') : ''
                      }`}
                    >
                      <div
                        className={`relative aspect-[63/88] rounded-xl overflow-hidden border-2 transition-all ${
                          isOpened ? (isFeatured ? 'border-amber-400 shadow-xl shadow-amber-400/60 scale-110' : 'border-yellow-500 shadow-lg shadow-yellow-500/50 scale-105') :
                          isSpinning ? 'border-blue-500 shadow-lg shadow-blue-500/50' : 'border-gray-700 hover:border-gray-600'
                        } ${isSpinning ? 'animate-spin-slow' : ''}`}
                        style={isSpinning ? { transformStyle: 'preserve-3d' } : {}}
                      >
                        {card.imageUrlGatherer ? (
                          <Image src={card.imageUrlGatherer} alt={card.name} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                            <span className="text-gray-600 text-xs">No Image</span>
                          </div>
                        )}
                        {isOpened && <div className={`absolute inset-0 ${isFeatured ? 'bg-amber-400/25' : 'bg-yellow-500/20'} animate-pulse`} />}
                        {isFeatured && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-gray-900 shadow-lg">
                            Best Pull
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-black/80 rounded-lg px-2 py-1 flex items-center gap-1">
                          <Coins className="h-3 w-3 text-amber-400" />
                          <span className="text-xs font-bold text-amber-400">{card.coinValue.toFixed(2)}</span>
                        </div>
                        <div className="absolute top-2 right-2 bg-black/80 rounded-lg px-2 py-1">
                          <span className="text-xs font-bold text-white">{card.pullRate.toFixed(3)}%</span>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        <p className="text-sm font-semibold text-white truncate">{card.name}</p>
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
          </div>

          {/* Your Pulls */}
          {pulls.length > 0 && (
            <div className="glass-strong rounded-2xl p-6 mt-6">
              <h2 className="text-xl font-bold text-white mb-4">Your Pulls</h2>
              <div className={`grid gap-4 ${
                pulls.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' :
                pulls.length === 2 ? 'grid-cols-2 max-w-md mx-auto' :
                pulls.length === 3 ? 'grid-cols-3 max-w-2xl mx-auto' :
                pulls.length <= 6 ? 'grid-cols-2 sm:grid-cols-3' :
                'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
              }`}>
                {pulls.map((pull) => {
                  const isFeatured = pull.id === featuredPullId;
                  return (
                    <div
                      key={pull.id}
                      className={`relative aspect-[63/88] rounded-xl overflow-hidden border-2 ring-4 transition-transform ${
                        isFeatured ? 'border-amber-400 ring-amber-400/60 scale-105 shadow-xl shadow-amber-400/40' : 'border-yellow-500 ring-yellow-500/50'
                      }`}
                    >
                      {pull.card?.imageUrlGatherer && (
                        <Image src={pull.card.imageUrlGatherer} alt={pull.card.name} fill className="object-cover" unoptimized />
                      )}
                      {isFeatured && (
                        <div className="absolute top-2 right-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-gray-900">
                          Best Pull
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2">
                        <p className="text-xs text-white truncate">{pull.card?.name}</p>
                        <p className="text-xs text-amber-400">{pull.card?.coinValue?.toFixed(2)} coins</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => router.push('/collection')}
                  className="px-6 py-3 rounded-xl font-semibold text-white gradient-border bg-gray-900/50 hover:bg-gray-800/50 transition-all"
                >
                  View Collection
                </button>
                <button
                  onClick={() => {
                    clearRevealTimeouts();
                    setPulls([]);
                    setOpenedCardIds(new Set());
                    setFeaturedPullId(null);
                    setFeaturedCardId(null);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl transition-all hover:scale-105"
                >
                  Open More
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reveal Modal */}
      {isShowingReveal && currentReveal?.card && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md glass-strong rounded-2xl p-6 border border-amber-400/50 shadow-2xl shadow-amber-500/30 flex flex-col items-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-300 text-center">
              Pull {currentRevealIndex} of {revealTotal || quantity}
            </p>
            <div className="relative aspect-[63/88] w-64 overflow-hidden rounded-xl border-2 border-amber-400 shadow-lg shadow-amber-400/60 mb-4">
              {currentReveal.card.imageUrlGatherer ? (
                <Image 
                  src={currentReveal.card.imageUrlGatherer} 
                  alt={currentReveal.card.name} 
                  fill 
                  className="object-contain" 
                  unoptimized 
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-800 text-gray-500">No Image</div>
              )}
            </div>
            <h3 className="mb-1 text-2xl font-bold text-white text-center">{currentReveal.card.name}</h3>
            <p className="mb-4 text-sm text-gray-400 text-center">{box.name}</p>
            <div className="flex items-center justify-center gap-2 text-amber-400">
              <Coins className="h-5 w-5" />
              <span className="text-xl font-semibold">{currentReveal.card.coinValue?.toFixed(2)} coins</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
