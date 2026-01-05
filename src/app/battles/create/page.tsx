'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Minus, Coins, Swords, Users, Trophy, Sparkles, Lock, Globe, Package, Zap, Crown, Share2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

type Card = {
  id: string;
  name: string;
  imageUrlGatherer?: string;
  imageUrlScryfall?: string;
  coinValue: number;
};

type Box = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  description: string;
  cardsPerPack: number;
  games?: string[];
  featured?: boolean;
  cards?: Card[];
  _count?: { cards: number };
};

export default function CreateBattlePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    players: '2' as '2' | '3' | '4',
    winCondition: 'NORMAL' as 'NORMAL' | 'UPSIDE_DOWN' | 'SHARE' | 'JACKPOT',
    privacy: 'PUBLIC' as 'PUBLIC' | 'PRIVATE',
    rounds: 1,
  });

  useEffect(() => {
    fetch('/api/boxes')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setBoxes(data.boxes);
        }
      })
      .catch((error) => {
        console.error('Error fetching boxes:', error);
      });
  }, []);

  const calculateTotalCost = () => {
    const box = boxes.find((b) => b.id === selectedBox);
    return box ? box.price * formData.rounds : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBox) {
      addToast({
        title: 'Error',
        description: 'Please select a box',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/battles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boxId: selectedBox,
          entryFee: 0,
          rounds: formData.rounds,
          battleMode: formData.winCondition === 'SHARE' ? 'NORMAL' : formData.winCondition,
          shareMode: formData.winCondition === 'SHARE',
          maxParticipants: parseInt(formData.players),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to create battle',
          variant: 'destructive',
        });
        return;
      }

      addToast({
        title: 'Battle Created! ⚔️',
        description: 'Your battle is ready. Waiting for players...',
      });

      router.push(`/battles/${data.battle.id}`);
    } catch (error) {
      console.error('Error creating battle:', error);
      addToast({
        title: 'Error',
        description: 'Failed to create battle',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const winConditions = [
    { value: 'NORMAL', label: 'Highest Wins', description: 'Highest total value wins all cards', icon: Crown, color: 'from-amber-500 to-yellow-500' },
    { value: 'UPSIDE_DOWN', label: 'Lowest Wins', description: 'Lowest total value wins all cards', icon: Trophy, color: 'from-blue-500 to-cyan-500' },
    { value: 'SHARE', label: 'Share Mode', description: 'Cards split evenly among players', icon: Share2, color: 'from-green-500 to-emerald-500' },
    { value: 'JACKPOT', label: 'Jackpot', description: 'Random weighted winner takes all', icon: Sparkles, color: 'from-purple-500 to-pink-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 radial-gradient pointer-events-none" />

      <div className="relative container py-12">
        {/* Back Link */}
        <Link 
          href="/battles" 
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Battles
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full glass border border-purple-500/20">
            <Swords className="w-5 h-5 text-purple-400" />
            <span className="text-purple-400 font-semibold">New Battle</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="text-white">Create </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">Battle</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Set up your battle parameters and challenge other players
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Step 1: Select Box */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                1
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Select Box</h2>
                <p className="text-gray-400 text-sm">Choose which box to battle with</p>
              </div>
            </div>
            
            {boxes.length === 0 ? (
              <div className="glass-strong rounded-2xl p-8 text-center border border-white/10">
                <Package className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No boxes available</p>
              </div>
            ) : (
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {boxes.map((box) => {
                  const isSelected = selectedBox === box.id;
                  return (
                    <button
                      key={box.id}
                      type="button"
                      onClick={() => setSelectedBox(box.id)}
                      className={`group glass rounded-xl overflow-hidden text-left transition-all card-lift ${
                        isSelected
                          ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/30'
                          : 'hover:ring-1 hover:ring-purple-500/50'
                      }`}
                    >
                      {/* Card Preview Section - Fanned Cards */}
                      <div className="relative h-48 bg-gradient-to-b from-gray-800/50 to-gray-900/80 flex items-end justify-center pb-2 overflow-hidden">
                        {/* Background glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 via-transparent to-transparent" />
                        
                        {/* Fanned Cards Display */}
                        {box.cards && box.cards.length > 0 ? (
                          <div className="relative h-40 w-full flex items-center justify-center">
                            {box.cards.slice(0, 3).map((card, index) => {
                              const rotations = [-15, 0, 15];
                              const translations = [-20, 0, 20];
                              const zIndexes = [1, 3, 2];
                              return (
                                <div
                                  key={card.id}
                                  className="absolute transition-transform duration-300 group-hover:scale-105"
                                  style={{
                                    transform: `rotate(${rotations[index]}deg) translateX(${translations[index]}px)`,
                                    zIndex: zIndexes[index],
                                  }}
                                >
                                  <div className="relative w-20 h-[110px] rounded-md overflow-hidden border-2 border-gray-600 shadow-lg group-hover:border-amber-400/50 transition-colors bg-gray-800">
                                    {card.imageUrlGatherer || card.imageUrlScryfall ? (
                                      <Image
                                        src={card.imageUrlGatherer || card.imageUrlScryfall || ''}
                                        alt={card.name}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gray-700">
                                        <span className="text-[8px] text-gray-500">?</span>
                                      </div>
                                    )}
                                    {/* Value badge on top card */}
                                    {index === 1 && (
                                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/80 flex items-center gap-0.5">
                                        <Coins className="w-2 h-2 text-amber-400" />
                                        <span className="text-[8px] font-bold text-amber-400">{card.coinValue}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Package className="w-12 h-12 text-gray-600" />
                          </div>
                        )}

                        {/* Selected Badge */}
                        {isSelected && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-[10px] font-bold text-white z-10">
                            ✓ Selected
                          </div>
                        )}
                        
                        {/* Featured Badge */}
                        {box.featured && !isSelected && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[10px] font-bold text-white z-10">
                            ⭐ Featured
                          </div>
                        )}
                        
                        {/* Game Badge */}
                        {box.games && box.games[0] && (
                          <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold badge-${box.games[0].toLowerCase()} z-10`}>
                            {box.games[0]}
                          </div>
                        )}
                      </div>

                      {/* Box Info */}
                      <div className="p-4 border-t border-gray-800">
                        <h3 className="text-sm font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors line-clamp-1">
                          {box.name}
                        </h3>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Coins className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-bold text-amber-400">{box.price.toLocaleString()}</span>
                            <span className="text-xs text-gray-500">coins</span>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-800/50 flex items-center justify-between text-[11px] text-gray-500">
                          <span>{box.cardsPerPack || 1} cards/pack</span>
                          <span>{box._count?.cards || 0} total</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2: Battle Settings */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                2
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Battle Settings</h2>
                <p className="text-gray-400 text-sm">Configure your battle</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Players */}
              <div className="glass-strong rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-bold text-white">Players</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(['2', '3', '4'] as const).map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setFormData({ ...formData, players: count })}
                      className={`py-4 rounded-xl font-bold text-2xl transition-all ${
                        formData.players === count
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                          : 'bg-white/5 text-gray-400 border border-white/10 hover:border-purple-500/50 hover:text-white'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rounds */}
              <div className="glass-strong rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-bold text-white">Rounds</h3>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rounds: Math.max(1, formData.rounds - 1) })}
                    className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-purple-500/50 transition-all flex items-center justify-center"
                  >
                    <Minus className="w-6 h-6" />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-4xl font-bold text-white">{formData.rounds}</span>
                    <p className="text-gray-500 text-sm">round{formData.rounds !== 1 ? 's' : ''}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rounds: Math.min(10, formData.rounds + 1) })}
                    className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-purple-500/50 transition-all flex items-center justify-center"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Win Condition */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                3
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Win Condition</h2>
                <p className="text-gray-400 text-sm">How the winner is determined</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {winConditions.map((condition) => {
                const Icon = condition.icon;
                const isActive = formData.winCondition === condition.value;
                return (
                  <button
                    key={condition.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, winCondition: condition.value as any })}
                    className={`relative rounded-2xl p-5 text-left transition-all border-2 ${
                      isActive
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-white/10 bg-white/5 hover:border-purple-500/50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${condition.color}`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-bold mb-1 ${isActive ? 'text-purple-400' : 'text-white'}`}>
                          {condition.label}
                        </h4>
                        <p className="text-gray-400 text-sm">{condition.description}</p>
                      </div>
                      {isActive && (
                        <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 4: Privacy */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                4
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Privacy</h2>
                <p className="text-gray-400 text-sm">Battle visibility</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { value: 'PUBLIC', label: 'Public Battle', description: 'Anyone can join', icon: Globe, color: 'from-green-500 to-emerald-500' },
                { value: 'PRIVATE', label: 'Private Battle', description: 'Invite only', icon: Lock, color: 'from-orange-500 to-red-500' },
              ].map((option) => {
                const Icon = option.icon;
                const isActive = formData.privacy === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, privacy: option.value as any })}
                    className={`relative rounded-2xl p-5 text-left transition-all border-2 ${
                      isActive
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-white/10 bg-white/5 hover:border-purple-500/50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${option.color}`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-bold mb-1 ${isActive ? 'text-purple-400' : 'text-white'}`}>
                          {option.label}
                        </h4>
                        <p className="text-gray-400 text-sm">{option.description}</p>
                      </div>
                      {isActive && (
                        <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary & Create Button */}
          <div className="glass-strong rounded-3xl p-8 border border-white/10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Summary */}
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Entry Cost</p>
                  <div className="flex items-center gap-2">
                    <Coins className="w-6 h-6 text-amber-400" />
                    <span className="text-3xl font-bold text-white">{calculateTotalCost().toLocaleString()}</span>
                  </div>
                </div>
                <div className="hidden sm:block w-px h-12 bg-white/10" />
                <div>
                  <p className="text-gray-400 text-sm mb-1">Players</p>
                  <p className="text-xl font-bold text-white">{formData.players}</p>
                </div>
                <div className="hidden sm:block w-px h-12 bg-white/10" />
                <div>
                  <p className="text-gray-400 text-sm mb-1">Rounds</p>
                  <p className="text-xl font-bold text-white">{formData.rounds}</p>
                </div>
                <div className="hidden sm:block w-px h-12 bg-white/10" />
                <div>
                  <p className="text-gray-400 text-sm mb-1">Mode</p>
                  <p className="text-xl font-bold text-white">
                    {winConditions.find(c => c.value === formData.winCondition)?.label}
                  </p>
                </div>
              </div>

              {/* Create Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !selectedBox}
                className="flex items-center justify-center gap-3 px-10 py-5 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 hover:from-purple-600 hover:via-pink-600 hover:to-purple-600 text-white font-bold text-lg rounded-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-purple-500/30"
              >
                {loading ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-6 h-6" />
                    Create Battle
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
