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

// Rarity tier definitions
type RarityTier = {
  border: string;
  shadow: string;
  bg: string;
  text: string;
  animation: string;
  lindwurm: string;
  glowColor: string;
  particleColor: string;
};

const COMMON_TIER: RarityTier = {
  border: 'border-gray-400',
  shadow: '',
  bg: 'bg-gray-400/20',
  text: 'text-gray-300',
  animation: '',
  lindwurm: 'lindwurm-common',
  glowColor: 'rgba(156, 163, 175, 0.6)',
  particleColor: '#9ca3af',
};

const UNCOMMON_TIER: RarityTier = {
  border: 'border-green-400',
  shadow: '',
  bg: 'bg-green-500/20',
  text: 'text-green-400',
  animation: '',
  lindwurm: 'lindwurm-uncommon',
  glowColor: 'rgba(74, 222, 128, 0.8)',
  particleColor: '#4ade80',
};

const RARE_TIER: RarityTier = {
  border: 'border-blue-400',
  shadow: '',
  bg: 'bg-blue-500/20',
  text: 'text-blue-400',
  animation: '',
  lindwurm: 'lindwurm-rare',
  glowColor: 'rgba(96, 165, 250, 0.9)',
  particleColor: '#60a5fa',
};

const EPIC_TIER: RarityTier = {
  border: 'border-purple-400',
  shadow: '',
  bg: 'bg-purple-500/20',
  text: 'text-purple-400',
  animation: '',
  lindwurm: 'lindwurm-epic',
  glowColor: 'rgba(192, 132, 252, 1)',
  particleColor: '#c084fc',
};

const LEGENDARY_TIER: RarityTier = {
  border: 'border-amber-400',
  shadow: '',
  bg: 'bg-amber-500/25',
  text: 'text-amber-400',
  animation: '',
  lindwurm: 'lindwurm-legendary',
  glowColor: 'rgba(251, 191, 36, 1)',
  particleColor: '#fbbf24',
};

// Rarity glow configuration - Maps ALL card game rarity formats
const RARITY_GLOW_CONFIG: Record<string, RarityTier> = {
  // === COMMON TIER ===
  'common': COMMON_TIER,
  'c': COMMON_TIER,
  
  // === UNCOMMON TIER ===
  'uncommon': UNCOMMON_TIER,
  'uc': UNCOMMON_TIER,
  'u': UNCOMMON_TIER,
  
  // === RARE TIER ===
  'rare': RARE_TIER,
  'r': RARE_TIER,
  'holo rare': RARE_TIER,
  'holo': RARE_TIER,
  'promo': RARE_TIER,
  'p': RARE_TIER,
  
  // === SUPER RARE / EPIC TIER ===
  'super rare': EPIC_TIER,
  'sr': EPIC_TIER,
  'epic': EPIC_TIER,
  'ultra rare': EPIC_TIER,
  'ultra': EPIC_TIER,
  'double rare': EPIC_TIER,
  'rr': EPIC_TIER,
  'leader': EPIC_TIER,
  'l': EPIC_TIER,
  'special': EPIC_TIER,
  'sp': EPIC_TIER,
  'illustration rare': EPIC_TIER,
  'ir': EPIC_TIER,
  'full art': EPIC_TIER,
  'fa': EPIC_TIER,
  'v': EPIC_TIER,
  'vstar': EPIC_TIER,
  'vmax': EPIC_TIER,
  'ex': EPIC_TIER,
  'gx': EPIC_TIER,
  
  // === LEGENDARY / MYTHIC TIER ===
  'legendary': LEGENDARY_TIER,
  'mythic': LEGENDARY_TIER,
  'mythic rare': LEGENDARY_TIER,
  'secret': LEGENDARY_TIER,
  'secret rare': LEGENDARY_TIER,
  'sec': LEGENDARY_TIER,
  'ssr': LEGENDARY_TIER,
  'ur': LEGENDARY_TIER,
  'alt art': LEGENDARY_TIER,
  'alternate art': LEGENDARY_TIER,
  'aa': LEGENDARY_TIER,
  'spr': LEGENDARY_TIER,  
  'special art rare': LEGENDARY_TIER,
  'sar': LEGENDARY_TIER,
  'art rare': LEGENDARY_TIER,
  'ar': LEGENDARY_TIER,
  'trainer gallery': LEGENDARY_TIER,
  'tg': LEGENDARY_TIER,
  'gold': LEGENDARY_TIER,
  'hyper rare': LEGENDARY_TIER,
  'hr': LEGENDARY_TIER,
  'chase': LEGENDARY_TIER,
  'manga': LEGENDARY_TIER,
  'comic': LEGENDARY_TIER,
};

// Get rarity glow config with smart fallback
const getRarityGlow = (rarity: string | undefined): RarityTier => {
  if (!rarity) return COMMON_TIER;
  
  const key = rarity.toLowerCase().trim();
  
  // Direct match
  if (RARITY_GLOW_CONFIG[key]) {
    return RARITY_GLOW_CONFIG[key];
  }
  
  // Partial match - check if any config key is contained in the rarity string
  for (const configKey of Object.keys(RARITY_GLOW_CONFIG)) {
    if (key.includes(configKey) || configKey.includes(key)) {
      return RARITY_GLOW_CONFIG[configKey];
    }
  }
  
  // Fallback to common
  return COMMON_TIER;
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
  const [openedCardIds, setOpenedCardIds] = useState<Set<string>>(new Set());
  const [featuredPullId, setFeaturedPullId] = useState<string | null>(null);
  const [featuredCardId, setFeaturedCardId] = useState<string | null>(null);
  const [currentReveal, setCurrentReveal] = useState<any | null>(null);
  const [currentRevealIndex, setCurrentRevealIndex] = useState(0);
  const [revealTotal, setRevealTotal] = useState(0);
  // Deck animation
  const [deckPhase, setDeckPhase] = useState<'idle'|'stacking'|'shuffling'|'drawing'|'revealed'|'summary'>('idle');
  const [deckKey, setDeckKey] = useState(0);
  const revealTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const pendingPullsRef = useRef<any[]>([]);

  const clearRevealTimeouts = () => {
    revealTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    revealTimeoutsRef.current = [];
    setCurrentReveal(null);
    setCurrentRevealIndex(0);
    setRevealTotal(0);
    setDeckPhase('idle');
  };

  const scheduleTimeout = (callback: () => void, delay: number) => {
    const timeoutId = setTimeout(callback, delay);
    revealTimeoutsRef.current.push(timeoutId);
  };

  const handleSkip = () => {
    const allPulls = pendingPullsRef.current;
    if (allPulls.length === 0) return;
    revealTimeoutsRef.current.forEach(clearTimeout);
    revealTimeoutsRef.current = [];
    setCurrentReveal(null);
    setCurrentRevealIndex(0);
    setRevealTotal(0);
    setPulls(allPulls);
    setOpenedCardIds(new Set(allPulls.map((p: any) => p.card?.id).filter(Boolean)));
    setOpening(false);
    setDeckPhase('summary');
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

  const handleOpen = async () => {
    if (!box || opening) return;

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
    setCurrentRevealIndex(0);
    setRevealTotal(0);
    setDeckKey(k => k + 1);
    setDeckPhase('stacking');

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
        setDeckPhase('idle');
        setOpening(false);
        return;
      }

      const pullsData = data.pulls || [];
      pendingPullsRef.current = pullsData;
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
        setDeckPhase('idle');
        setOpening(false);
        addToast({ title: 'Success', description: `Opened ${quantity} box${quantity > 1 ? 'es' : ''}!` });
        return;
      }

      const numCards = pullsData.length;
      const STACK_MS  = 700;  // stacking phase duration
      const SHUFFLE_MS = 750; // shuffle phase duration
      const DRAW_MS   = 550;  // top-card lift animation
      const REVEAL_MS = 2800; // card shown duration

      // Phase transitions: stacking → shuffling → draw/reveal sequence
      scheduleTimeout(() => setDeckPhase('shuffling'), STACK_MS);

      scheduleTimeout(() => {
        let t = 0;
        pullsData.forEach((pull: any, index: number) => {
          const isLast = index === pullsData.length - 1;

          scheduleTimeout(() => setDeckPhase('drawing'), t);
          t += DRAW_MS;

          scheduleTimeout(() => {
            setCurrentReveal(pull);
            setCurrentRevealIndex(index + 1);
            setDeckPhase('revealed');
            setOpenedCardIds(prev => {
              const next = new Set(prev);
              if (pull.card?.id) next.add(pull.card.id);
              return next;
            });
            setPulls(prev => [...prev, pull]);
          }, t);
          t += REVEAL_MS;

          if (!isLast) {
            scheduleTimeout(() => {
              setCurrentReveal(null);
              setDeckKey(k => k + 1);
              setDeckPhase('shuffling');
            }, t);
            t += SHUFFLE_MS;
          } else {
            scheduleTimeout(() => {
              setCurrentReveal(null);
              setDeckPhase('summary');
              setOpening(false);
            }, t);
          }
        });
      }, STACK_MS + SHUFFLE_MS);
    } catch (error) {
      console.error('Error opening box:', error);
      clearRevealTimeouts();
      setOpening(false);
      addToast({ title: 'Error', description: 'Failed to open box', variant: 'destructive' });
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
              <div className={`grid gap-5 ${
                box.cards.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' :
                box.cards.length === 2 ? 'grid-cols-2 max-w-lg mx-auto' :
                box.cards.length === 3 ? 'grid-cols-3 max-w-2xl mx-auto' :
                box.cards.length <= 6 ? 'grid-cols-2 sm:grid-cols-3' :
                box.cards.length <= 12 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' :
                'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
              }`}>
                {box.cards.map((card) => {
                  const isOpened = openedCardIds.has(card.id);
                  const isFeatured = isOpened && featuredCardId === card.id;
                  const cardRarityGlow = getRarityGlow(card.rarity);

                  return (
                    <div
                      key={card.id}
                      className={`relative group transition-all duration-300 rounded-2xl p-3 flex flex-col h-full ${
                        isOpened
                          ? `ring-2 ring-offset-2 ring-offset-gray-900 z-10 ${isFeatured ? 'scale-[1.02]' : ''} ${cardRarityGlow.border.replace('border-', 'ring-')}`
                          : ''
                      }`}
                      style={{
                        background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.6) 100%)',
                        border: isOpened ? undefined : '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      {/* Glow effect behind card on hover */}
                      <div
                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl -z-10"
                        style={{
                          background: `radial-gradient(circle at center, ${cardRarityGlow.glowColor}, transparent 70%)`,
                          transform: 'scale(1.1)',
                        }}
                      />

                      <div
                        className={`relative aspect-[63/88] w-full rounded-xl overflow-hidden border transition-all duration-300 ${
                          isOpened
                            ? `${cardRarityGlow.border} ${isFeatured ? 'scale-105' : 'scale-[1.02]'}`
                            : 'border-white/[0.08] group-hover:border-white/[0.15]'
                        } group-hover:-translate-y-1 group-hover:scale-[1.03]`}
                        style={{
                          boxShadow: `0 0 0 0 ${cardRarityGlow.glowColor.replace('1)', '0)')}`,
                          transition: 'all 0.3s ease, box-shadow 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isOpened) {
                            e.currentTarget.style.boxShadow = `
                              0 0 30px 8px ${cardRarityGlow.glowColor.replace('1)', '0.6)')},
                              0 0 60px 15px ${cardRarityGlow.glowColor.replace('1)', '0.3)')},
                              0 20px 40px rgba(0, 0, 0, 0.5)
                            `;
                            e.currentTarget.style.borderColor = cardRarityGlow.glowColor.replace('rgba(', '').replace(')', '').replace(/[\d.]+\)$/, '0.8)');
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isOpened) {
                            e.currentTarget.style.boxShadow = `0 0 0 0 ${cardRarityGlow.glowColor.replace('1)', '0)')}`;
                            e.currentTarget.style.borderColor = '';
                          }
                        }}
                        data-rarity={card.rarity?.toLowerCase() || 'common'}
                      >
                        {card.imageUrlGatherer ? (
                          <Image src={card.imageUrlGatherer} alt={card.name} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full bg-gray-800/60 flex items-center justify-center">
                            <span className="text-gray-600 text-xs">No Image</span>
                          </div>
                        )}
                        {isFeatured && (
                          <div className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full ${cardRarityGlow.bg} ${cardRarityGlow.border} px-3 py-1 text-xs font-bold ${cardRarityGlow.text}`}>
                            Best Pull
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
                          <Coins className="h-3 w-3 text-amber-400" />
                          <span className="text-xs font-bold text-amber-400">{card.coinValue.toFixed(2)}</span>
                        </div>
                        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1">
                          <span className="text-xs font-bold text-white">{card.pullRate.toFixed(3)}%</span>
                        </div>
                        {/* Rarity indicator */}
                        <div className={`absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase backdrop-blur-sm ${cardRarityGlow.bg} ${cardRarityGlow.text}`}>
                          {card.rarity || 'Common'}
                        </div>
                      </div>
                      {/* Card name - fixed height area so all boxes are uniform */}
                      <div className="mt-2.5 px-1 text-center h-10 flex items-center justify-center">
                        <p className={`text-sm font-semibold truncate w-full ${cardRarityGlow.text}`}>{card.name}</p>
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
              <div className={`grid gap-5 ${
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
                      className="relative group rounded-2xl p-3 flex flex-col h-full transition-all duration-300"
                      style={{
                        background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.6) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      {/* Glow effect behind pulled card on hover */}
                      <div 
                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl -z-10"
                        style={{
                          background: `radial-gradient(circle at center, ${pullRarityGlow.glowColor}, transparent 70%)`,
                          transform: 'scale(1.15)',
                        }}
                      />
                      
                      <div
                        className={`relative aspect-[63/88] w-full rounded-xl overflow-hidden border transition-all duration-300 ${
                          isFeatured 
                            ? `${pullRarityGlow.border} ring-2 ring-amber-400/40 scale-[1.02]` 
                            : `${pullRarityGlow.border.replace('border-', 'border-').replace('400', '400/60')} group-hover:-translate-y-1 group-hover:scale-[1.03]`
                        }`}
                        onMouseEnter={(e) => {
                          if (!isFeatured) {
                            e.currentTarget.style.boxShadow = `
                              0 0 30px 8px ${pullRarityGlow.glowColor.replace('1)', '0.7)')},
                              0 0 60px 15px ${pullRarityGlow.glowColor.replace('1)', '0.4)')},
                              0 25px 50px rgba(0, 0, 0, 0.6)
                            `;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isFeatured) {
                            e.currentTarget.style.boxShadow = '';
                          }
                        }}
                      >
                      {pull.card?.imageUrlGatherer && (
                        <Image src={pull.card.imageUrlGatherer} alt={pull.card.name} fill className="object-cover" unoptimized />
                      )}
                      {isFeatured && (
                        <div className={`absolute top-2 right-2 rounded-full backdrop-blur-sm ${pullRarityGlow.bg} ${pullRarityGlow.border} px-2 py-0.5 text-[10px] font-bold ${pullRarityGlow.text}`}>
                          Best Pull
                        </div>
                      )}
                      {/* Rarity indicator */}
                      <div className={`absolute top-2 left-2 rounded-full backdrop-blur-sm px-2 py-0.5 text-[9px] font-bold uppercase ${pullRarityGlow.bg} ${pullRarityGlow.text}`}>
                        {pull.card?.rarity || 'Common'}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-2">
                        <p className="text-xs text-white truncate">{pull.card?.name}</p>
                        <p className={`text-xs ${pullRarityGlow.text}`}>{pull.card?.coinValue?.toFixed(2)} coins</p>
                      </div>
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

      {/* Deck Animation Overlay */}
      {deckPhase !== 'idle' && deckPhase !== 'summary' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm">
          <div className="relative flex flex-col items-center">

            {/* Status label */}
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 text-center min-h-[16px]">
              {deckPhase === 'stacking' && `Opening ${quantity} box${quantity > 1 ? 'es' : ''}…`}
              {(deckPhase === 'shuffling' || deckPhase === 'drawing') && (
                currentRevealIndex === 0
                  ? 'Shuffling deck…'
                  : `Pull ${currentRevealIndex + 1} of ${revealTotal}`
              )}
              {deckPhase === 'revealed' && `Pull ${currentRevealIndex} of ${revealTotal}`}
            </p>

            {/* Card container */}
            <div
              className="relative"
              style={{ width: 'min(260px, 65vw)', height: 'calc(min(260px, 65vw) * 88 / 63)' }}
            >
              {/* Face-down deck stack */}
              {deckPhase !== 'revealed' && (
                <div
                  key={deckKey}
                  className={`absolute inset-0 ${deckPhase === 'shuffling' ? 'deck-shuffle' : ''}`}
                >
                  {(() => {
                    const deckCount = Math.max(1, revealTotal - currentRevealIndex);
                    return Array.from({ length: deckCount }, (_, i) => deckCount - 1 - i).map((offset) => (
                      <div
                        key={offset}
                        className="absolute inset-0"
                        style={{
                          transform: offset > 0 ? `translate(${offset * -3}px, ${offset * -4}px)` : undefined,
                          zIndex: deckCount - offset,
                        }}
                      >
                        <div
                          className={`absolute inset-0 rounded-xl overflow-hidden border border-blue-400/20 ${
                            deckPhase === 'stacking' ? 'deck-card-in' : ''
                          } ${offset === 0 && deckPhase === 'drawing' ? 'deck-draw-lift' : ''}`}
                          style={{
                            animationDelay: deckPhase === 'stacking' ? `${(deckCount - 1 - offset) * 80}ms` : '0ms',
                            background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1e3a5f 100%)',
                          }}
                        >
                          {/* Card back pattern */}
                          <div className="absolute inset-2 rounded-lg border border-blue-300/20 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-md border border-blue-300/15 flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-blue-400/40" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* Revealed card — full 3D flip: back → face */}
              {deckPhase === 'revealed' && currentReveal?.card && (() => {
                const rarityGlow = getRarityGlow(currentReveal.card.rarity);
                return (
                  <div className="absolute inset-0" style={{ perspective: '900px' }}>
                    {/* Flip container: rotates from 0° (back visible) to 180° (face visible) */}
                    <div
                      className="deck-flip-full absolute inset-0"
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      {/* Front face: card back (visible at 0°) */}
                      <div
                        className="absolute inset-0 rounded-xl overflow-hidden border border-blue-400/20"
                        style={{
                          backfaceVisibility: 'hidden',
                          background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1e3a5f 100%)',
                        }}
                      >
                        <div className="absolute inset-2 rounded-lg border border-blue-300/20 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-md border border-blue-300/15 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-blue-400/40" />
                          </div>
                        </div>
                      </div>

                      {/* Back face: card image (visible at 180°) */}
                      <div
                        className="absolute inset-0 rounded-xl overflow-hidden border"
                        style={{
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                          borderColor: rarityGlow.glowColor,
                          boxShadow: `0 0 40px 10px ${rarityGlow.glowColor.replace('1)', '0.4)')}, 0 25px 60px rgba(0,0,0,0.7)`,
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
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Card info shown on reveal */}
            {deckPhase === 'revealed' && currentReveal?.card && (() => {
              const rarityGlow = getRarityGlow(currentReveal.card.rarity);
              return (
                <div
                  className="mt-5 flex flex-col items-center gap-1.5 deck-info-reveal"
                  style={{ maxWidth: 'min(260px, 65vw)' }}
                >
                  <h3 className="text-xl font-bold text-white text-center leading-snug">
                    {currentReveal.card.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>{box.name}</span>
                    <span className="text-gray-600">·</span>
                    <span className={`font-semibold ${rarityGlow.text}`}>{currentReveal.card.rarity || 'Common'}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 px-5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                    <Coins className="h-5 w-5 text-amber-400" />
                    <span className="text-lg font-bold text-white">
                      {currentReveal.card.coinValue?.toFixed(2)} coins
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Skip button */}
            <button
              onClick={handleSkip}
              className="mt-8 px-6 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-white border border-gray-800 hover:border-gray-600 transition-all"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Summary Overlay */}
      {deckPhase === 'summary' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative flex flex-col items-center w-full max-w-2xl py-8">

            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Opening Results</p>
            <h2 className="text-2xl font-bold text-white mb-6">
              {quantity} Box{quantity > 1 ? 'es' : ''} · {pulls.length} Card{pulls.length !== 1 ? 's' : ''}
            </h2>

            {/* Card grid */}
            <div className={`grid gap-3 w-full mb-8 ${
              pulls.length === 1 ? 'grid-cols-1 max-w-[140px] mx-auto' :
              pulls.length === 2 ? 'grid-cols-2 max-w-xs mx-auto' :
              pulls.length <= 4 ? 'grid-cols-2 sm:grid-cols-4 max-w-md mx-auto' :
              pulls.length <= 6 ? 'grid-cols-3' :
              'grid-cols-3 sm:grid-cols-4 md:grid-cols-5'
            }`}>
              {pulls.map((pull) => {
                const rarityGlow = getRarityGlow(pull.card?.rarity);
                const isFeatured = pull.id === featuredPullId;
                return (
                  <div key={pull.id} className="relative flex flex-col">
                    <div
                      className={`relative aspect-[63/88] w-full rounded-xl overflow-hidden border ${
                        isFeatured ? `${rarityGlow.border} ring-2 ring-amber-400/40` : rarityGlow.border
                      }`}
                      style={{
                        boxShadow: isFeatured
                          ? `0 0 24px 6px ${rarityGlow.glowColor.replace('1)', '0.5)')}`
                          : `0 0 12px 2px ${rarityGlow.glowColor.replace('1)', '0.25)')}`,
                      }}
                    >
                      {pull.card?.imageUrlGatherer ? (
                        <Image src={pull.card.imageUrlGatherer} alt={pull.card.name} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <span className="text-gray-600 text-xs">No Image</span>
                        </div>
                      )}
                      <div className={`absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-black/70 backdrop-blur-sm`}>
                        <p className="text-[10px] text-white truncate">{pull.card?.name}</p>
                        <p className={`text-[10px] font-semibold ${rarityGlow.text}`}>
                          {pull.card?.coinValue?.toFixed(2)} coins
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total value */}
            <div className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-6">
              <Coins className="w-6 h-6 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest">Total Value</p>
                <p className="text-2xl font-bold text-white">
                  {pulls.reduce((sum, p) => sum + (p.card?.coinValue ?? 0), 0).toFixed(2)} coins
                </p>
              </div>
            </div>

            <button
              onClick={() => setDeckPhase('idle')}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all hover:scale-105"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
