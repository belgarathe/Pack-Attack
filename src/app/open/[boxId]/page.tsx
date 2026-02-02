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
  rarity: string;
};

// Rarity glow configuration - Enhanced with Lindwurm styling
const RARITY_GLOW_CONFIG: Record<string, {
  border: string;
  shadow: string;
  bg: string;
  text: string;
  animation: string;
  lindwurm: string;
  glowColor: string;
  particleColor: string;
}> = {
  common: {
    border: 'border-gray-400',
    shadow: 'shadow-gray-400/50',
    bg: 'bg-gray-400/20',
    text: 'text-gray-300',
    animation: '',
    lindwurm: 'lindwurm-common',
    glowColor: 'rgba(156, 163, 175, 0.6)',
    particleColor: '#9ca3af',
  },
  uncommon: {
    border: 'border-green-400',
    shadow: 'shadow-green-400/60',
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    animation: 'animate-glow-uncommon',
    lindwurm: 'lindwurm-uncommon',
    glowColor: 'rgba(74, 222, 128, 0.8)',
    particleColor: '#4ade80',
  },
  rare: {
    border: 'border-blue-400',
    shadow: 'shadow-blue-400/70',
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    animation: 'animate-glow-rare',
    lindwurm: 'lindwurm-rare',
    glowColor: 'rgba(96, 165, 250, 0.9)',
    particleColor: '#60a5fa',
  },
  epic: {
    border: 'border-purple-400',
    shadow: 'shadow-purple-500/70',
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    animation: 'animate-glow-epic',
    lindwurm: 'lindwurm-epic',
    glowColor: 'rgba(192, 132, 252, 1)',
    particleColor: '#c084fc',
  },
  mythic: {
    border: 'border-amber-400',
    shadow: 'shadow-amber-400/80',
    bg: 'bg-amber-500/25',
    text: 'text-amber-400',
    animation: 'animate-glow-legendary',
    lindwurm: 'lindwurm-mythic',
    glowColor: 'rgba(251, 191, 36, 1)',
    particleColor: '#fbbf24',
  },
  legendary: {
    border: 'border-amber-400',
    shadow: 'shadow-amber-400/80',
    bg: 'bg-amber-500/25',
    text: 'text-amber-400',
    animation: 'animate-glow-legendary',
    lindwurm: 'lindwurm-legendary',
    glowColor: 'rgba(251, 191, 36, 1)',
    particleColor: '#fbbf24',
  },
};

const getRarityGlow = (rarity: string | undefined) => {
  const key = rarity?.toLowerCase() || 'common';
  return RARITY_GLOW_CONFIG[key] || RARITY_GLOW_CONFIG.common;
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
                  <Image src={box.imageUrl} alt={box.name} fill className="object-cover"  />
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
                  const cardRarityGlow = getRarityGlow(card.rarity);

                  return (
                    <div
                      key={card.id}
                      className={`relative group transition-transform ${
                        isOpened ? `ring-4 ring-offset-2 ring-offset-gray-900 z-10 ${isFeatured ? 'scale-[1.03]' : ''}` : ''
                      } ${isOpened ? cardRarityGlow.border.replace('border-', 'ring-') : ''}`}
                    >
                      <div
                        className={`relative aspect-[63/88] rounded-xl overflow-hidden border-2 transition-all rarity-card-hover ${
                          isOpened 
                            ? `${cardRarityGlow.border} ${cardRarityGlow.shadow} ${isFeatured ? 'shadow-xl scale-110' : 'shadow-lg scale-105'} ${cardRarityGlow.animation}` 
                            : isSpinning 
                              ? 'border-blue-500 shadow-lg shadow-blue-500/50' 
                              : 'border-gray-700'
                        } ${isSpinning ? 'animate-spin-slow' : ''}`}
                        style={isSpinning ? { transformStyle: 'preserve-3d' } : {}}
                        data-rarity={card.rarity?.toLowerCase() || 'common'}
                      >
                        {card.imageUrlGatherer ? (
                          <Image src={card.imageUrlGatherer} alt={card.name} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                            <span className="text-gray-600 text-xs">No Image</span>
                          </div>
                        )}
                        {isOpened && <div className={`absolute inset-0 ${cardRarityGlow.bg} animate-pulse`} />}
                        {isFeatured && (
                          <div className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full ${cardRarityGlow.bg} ${cardRarityGlow.border} px-3 py-1 text-xs font-bold ${cardRarityGlow.text} shadow-lg backdrop-blur-sm`}>
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
                        {/* Rarity indicator */}
                        <div className={`absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${cardRarityGlow.bg} ${cardRarityGlow.text} backdrop-blur-sm`}>
                          {card.rarity || 'Common'}
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        <p className={`text-sm font-semibold truncate ${cardRarityGlow.text}`}>{card.name}</p>
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
                  const pullRarityGlow = getRarityGlow(pull.card?.rarity);
                  return (
                    <div
                      key={pull.id}
                      className={`relative aspect-[63/88] rounded-xl overflow-hidden border-2 ring-4 transition-transform ${
                        isFeatured 
                          ? `${pullRarityGlow.border} ring-amber-400/60 scale-105 ${pullRarityGlow.shadow} shadow-xl ${pullRarityGlow.animation}` 
                          : `${pullRarityGlow.border} ring-offset-2 ring-offset-gray-900 ${pullRarityGlow.shadow}`
                      }`}
                      style={{ ['--tw-ring-color' as string]: pullRarityGlow.border.replace('border-', 'rgb(var(--') }}
                    >
                      {pull.card?.imageUrlGatherer && (
                        <Image src={pull.card.imageUrlGatherer} alt={pull.card.name} fill className="object-cover" unoptimized />
                      )}
                      {isFeatured && (
                        <div className={`absolute top-2 right-2 rounded-full ${pullRarityGlow.bg} ${pullRarityGlow.border} px-2 py-0.5 text-[10px] font-bold ${pullRarityGlow.text}`}>
                          Best Pull
                        </div>
                      )}
                      {/* Rarity indicator */}
                      <div className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${pullRarityGlow.bg} ${pullRarityGlow.text} backdrop-blur-sm`}>
                        {pull.card?.rarity || 'Common'}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2">
                        <p className="text-xs text-white truncate">{pull.card?.name}</p>
                        <p className={`text-xs ${pullRarityGlow.text}`}>{pull.card?.coinValue?.toFixed(2)} coins</p>
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

      {/* Reveal Modal - DRAMATIC Lindwurm Dragon Border */}
      {isShowingReveal && currentReveal?.card && (() => {
        const rarityGlow = getRarityGlow(currentReveal.card.rarity);
        const rarity = currentReveal.card.rarity?.toLowerCase() || 'common';
        const isHighRarity = ['epic', 'mythic', 'legendary'].includes(rarity);
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
            {/* MASSIVE Ambient glow background */}
            <div 
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at center, ${rarityGlow.glowColor} 0%, ${rarityGlow.glowColor.replace('1)', '0.5)')} 30%, transparent 70%)`,
              }}
            />
            
            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: `${8 + Math.random() * 12}px`,
                    height: `${8 + Math.random() * 12}px`,
                    background: rarityGlow.particleColor,
                    left: `${5 + (i * 4.5)}%`,
                    top: `${15 + Math.sin(i * 0.8) * 35}%`,
                    animation: `pulse ${1 + Math.random()}s ease-in-out infinite`,
                    animationDelay: `${i * 0.15}s`,
                    boxShadow: `0 0 20px 10px ${rarityGlow.particleColor}, 0 0 40px 20px ${rarityGlow.particleColor}`,
                  }}
                />
              ))}
            </div>
            
            {/* Main card container */}
            <div className="relative card-reveal-animate">
              
              {/* ===== DRAGON BORDER FRAME ===== */}
              <svg 
                className="absolute pointer-events-none"
                style={{
                  top: '-60px',
                  left: '-60px',
                  width: 'calc(100% + 120px)',
                  height: 'calc(100% + 120px)',
                  filter: `drop-shadow(0 0 30px ${rarityGlow.particleColor}) drop-shadow(0 0 60px ${rarityGlow.particleColor})`,
                }}
                viewBox="0 0 440 600"
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Gradient for dragon body */}
                  <linearGradient id={`dragon-grad-${currentReveal.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={rarityGlow.particleColor}/>
                    <stop offset="50%" stopColor={rarityGlow.particleColor} stopOpacity="0.7"/>
                    <stop offset="100%" stopColor={rarityGlow.particleColor}/>
                  </linearGradient>
                  
                  {/* Strong glow filter */}
                  <filter id={`dragon-glow-${currentReveal.id}`} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="8" result="blur"/>
                    <feMerge>
                      <feMergeNode in="blur"/>
                      <feMergeNode in="blur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {/* === LEFT DRAGON/SERPENT === */}
                <g filter={`url(#dragon-glow-${currentReveal.id})`}>
                  {/* Dragon head - top left */}
                  <path 
                    d="M60 80 L30 50 L20 70 L35 80 L20 90 L30 110 L60 90 Z" 
                    fill={rarityGlow.particleColor}
                    style={{ animation: 'dragon-breathe 1.5s ease-in-out infinite' }}
                  />
                  {/* Eye */}
                  <circle cx="45" cy="75" r="6" fill="white"/>
                  <circle cx="47" cy="75" r="3" fill="black"/>
                  
                  {/* Left serpent body - wavy */}
                  <path 
                    d="M50 95 
                       Q20 130 35 170 
                       Q50 210 25 250 
                       Q0 290 30 330 
                       Q60 370 30 410 
                       Q0 450 40 490
                       Q60 520 50 550"
                    stroke={`url(#dragon-grad-${currentReveal.id})`}
                    strokeWidth="20"
                    fill="none"
                    strokeLinecap="round"
                    style={{ animation: 'dragon-pulse 2s ease-in-out infinite' }}
                  />
                  
                  {/* Dragon scales on left body */}
                  <circle cx="35" cy="140" r="8" fill={rarityGlow.particleColor} opacity="0.9"/>
                  <circle cx="25" cy="200" r="8" fill={rarityGlow.particleColor} opacity="0.9"/>
                  <circle cx="35" cy="260" r="8" fill={rarityGlow.particleColor} opacity="0.9"/>
                  <circle cx="20" cy="320" r="8" fill={rarityGlow.particleColor} opacity="0.9"/>
                  <circle cx="40" cy="380" r="8" fill={rarityGlow.particleColor} opacity="0.9"/>
                  <circle cx="25" cy="440" r="8" fill={rarityGlow.particleColor} opacity="0.9"/>
                  <circle cx="45" cy="500" r="8" fill={rarityGlow.particleColor} opacity="0.9"/>
                </g>
                
                {/* === RIGHT DRAGON/SERPENT === */}
                <g filter={`url(#dragon-glow-${currentReveal.id})`}>
                  {/* Dragon head - top right */}
                  <path 
                    d="M380 80 L410 50 L420 70 L405 80 L420 90 L410 110 L380 90 Z" 
                    fill={rarityGlow.particleColor}
                    style={{ animation: 'dragon-breathe 1.5s ease-in-out infinite', animationDelay: '0.5s' }}
                  />
                  {/* Eye */}
                  <circle cx="395" cy="75" r="6" fill="white"/>
                  <circle cx="393" cy="75" r="3" fill="black"/>
                  
                  {/* Right serpent body - wavy (mirrored) */}
                  <path 
                    d="M390 95 
                       Q420 130 405 170 
                       Q390 210 415 250 
                       Q440 290 410 330 
                       Q380 370 410 410 
                       Q440 450 400 490
                       Q380 520 390 550"
                    stroke={`url(#dragon-grad-${currentReveal.id})`}
                    strokeWidth="20"
                    fill="none"
                    strokeLinecap="round"
                    style={{ animation: 'dragon-pulse 2s ease-in-out infinite', animationDelay: '1s' }}
                  />
                  
                  {/* Dragon scales on right body */}
                  <circle cx="405" cy="140" r="8" fill={rarityGlow.particleColor} opacity="0.9"/>
                  <circle cx="415" cy="200" r="8" fill={rarityGlow.particleColor} opacity="0.9"/>
                  <circle cx="405" cy="260" r="8" fill={rarityGlow.particleColor} opacity="0.9"/>
                  <circle cx="420" cy="320" r="8" fill={rarityGlow.particleColor} opacity="0.9"/>
                  <circle cx="400" cy="380" r="8" fill={rarityGlow.particleColor} opacity="0.9"/>
                  <circle cx="415" cy="440" r="8" fill={rarityGlow.particleColor} opacity="0.9"/>
                  <circle cx="395" cy="500" r="8" fill={rarityGlow.particleColor} opacity="0.9"/>
                </g>
                
                {/* === TAIL AT BOTTOM === */}
                <g filter={`url(#dragon-glow-${currentReveal.id})`}>
                  {/* Left tail curling */}
                  <path 
                    d="M50 550 Q100 580 150 570 Q180 560 200 580 Q220 590 220 570"
                    stroke={rarityGlow.particleColor}
                    strokeWidth="16"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Right tail curling */}
                  <path 
                    d="M390 550 Q340 580 290 570 Q260 560 240 580 Q220 590 220 570"
                    stroke={rarityGlow.particleColor}
                    strokeWidth="16"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Tail spikes */}
                  <polygon points="220,570 210,590 220,585 230,590" fill={rarityGlow.particleColor}/>
                </g>
                
                {/* === DECORATIVE FLAMES/BREATH from dragon heads === */}
                {isHighRarity && (
                  <g style={{ animation: 'dragon-breathe 0.8s ease-in-out infinite' }}>
                    {/* Left dragon breath */}
                    <ellipse cx="15" cy="65" rx="12" ry="8" fill={rarityGlow.particleColor} opacity="0.6"/>
                    <ellipse cx="5" cy="60" rx="8" ry="5" fill={rarityGlow.particleColor} opacity="0.4"/>
                    {/* Right dragon breath */}
                    <ellipse cx="425" cy="65" rx="12" ry="8" fill={rarityGlow.particleColor} opacity="0.6"/>
                    <ellipse cx="435" cy="60" rx="8" ry="5" fill={rarityGlow.particleColor} opacity="0.4"/>
                  </g>
                )}
              </svg>
              
              {/* Card content container */}
              <div 
                className={`relative w-full max-w-sm glass-strong rounded-2xl p-6 border-4 ${rarityGlow.border} flex flex-col items-center ${rarityGlow.animation}`}
                style={{
                  boxShadow: `
                    0 0 60px 20px ${rarityGlow.glowColor},
                    0 0 120px 40px ${rarityGlow.glowColor},
                    0 0 200px 60px ${rarityGlow.glowColor.replace('1)', '0.5)')},
                    inset 0 0 60px ${rarityGlow.glowColor}
                  `,
                }}
              >
                {/* Rarity badge */}
                <div 
                  className={`absolute -top-6 left-1/2 -translate-x-1/2 px-8 py-3 rounded-full ${rarityGlow.bg} border-4 ${rarityGlow.border} backdrop-blur-sm z-10`}
                  style={{
                    boxShadow: `0 0 40px 15px ${rarityGlow.glowColor}, 0 0 80px 30px ${rarityGlow.glowColor}`,
                  }}
                >
                  <span 
                    className={`text-lg font-black uppercase tracking-widest ${rarityGlow.text}`}
                    style={{
                      textShadow: `0 0 20px ${rarityGlow.glowColor}, 0 0 40px ${rarityGlow.glowColor}`,
                    }}
                  >
                    {currentReveal.card.rarity || 'Common'}
                  </span>
                </div>
                
                <p className="mb-4 mt-6 text-base font-bold uppercase tracking-wide text-gray-200 text-center">
                  Pull {currentRevealIndex} of {revealTotal || quantity}
                </p>
                
                {/* Card image */}
                <div 
                  className={`relative aspect-[63/88] w-72 overflow-hidden rounded-xl border-4 ${rarityGlow.border} mb-4 ${rarityGlow.animation}`}
                  style={{
                    boxShadow: `
                      0 0 50px 15px ${rarityGlow.glowColor},
                      0 0 100px 30px ${rarityGlow.glowColor},
                      inset 0 0 40px ${rarityGlow.glowColor}
                    `,
                  }}
                >
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
                
                {/* Card name */}
                <h3 
                  className={`mb-2 text-3xl font-black text-center ${rarityGlow.text}`}
                  style={{
                    textShadow: `0 0 30px ${rarityGlow.glowColor}, 0 0 60px ${rarityGlow.glowColor}, 0 0 90px ${rarityGlow.glowColor}`,
                  }}
                >
                  {currentReveal.card.name}
                </h3>
                <p className="mb-4 text-base text-gray-300 text-center font-medium">{box.name}</p>
                
                {/* Coin value */}
                <div 
                  className={`flex items-center justify-center gap-4 px-8 py-4 rounded-full ${rarityGlow.bg} border-4 ${rarityGlow.border}`}
                  style={{
                    boxShadow: `0 0 40px 10px ${rarityGlow.glowColor}, 0 0 80px 20px ${rarityGlow.glowColor}`,
                  }}
                >
                  <Coins className={`h-8 w-8 ${rarityGlow.text}`} style={{ filter: `drop-shadow(0 0 10px ${rarityGlow.glowColor})` }} />
                  <span 
                    className={`text-3xl font-black ${rarityGlow.text}`}
                    style={{
                      textShadow: `0 0 20px ${rarityGlow.glowColor}, 0 0 40px ${rarityGlow.glowColor}`,
                    }}
                  >
                    {currentReveal.card.coinValue?.toFixed(2)} coins
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
