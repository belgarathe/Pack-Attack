'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Minus, Coins, Swords, Users, Trophy, Sparkles, Lock, Globe } from 'lucide-react';
import Link from 'next/link';

type Box = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  description: string;
};

export default function CreateBattlePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedBoxes, setSelectedBoxes] = useState<string[]>([]);
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

  const toggleBox = (boxId: string) => {
    setSelectedBoxes((prev) =>
      prev.includes(boxId) ? prev.filter((id) => id !== boxId) : [...prev, boxId]
    );
  };

  const calculateTotalCost = () => {
    return selectedBoxes.reduce((total, boxId) => {
      const box = boxes.find((b) => b.id === boxId);
      return total + (box ? box.price * formData.rounds : 0);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedBoxes.length === 0) {
      addToast({
        title: 'Error',
        description: 'Please select at least one box',
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
          boxId: selectedBoxes[0],
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
        title: 'Success',
        description: 'Battle created successfully!',
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
    { value: 'NORMAL', label: 'Highest Total Value', description: 'Player with highest value wins all', icon: Trophy },
    { value: 'UPSIDE_DOWN', label: 'Lowest Total Value', description: 'Player with lowest value wins all', icon: Trophy },
    { value: 'SHARE', label: 'Share Mode', description: 'Items split evenly among all players', icon: Users },
    { value: 'JACKPOT', label: 'Jackpot', description: 'Weighted random - one winner takes all', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />
      <div className="fixed top-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl hidden lg:block" />

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
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full glass text-sm border border-purple-500/20">
            <Swords className="w-4 h-4 text-purple-400" />
            <span className="text-gray-300">New Battle</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">
            <span className="text-white">Create </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Battle</span>
          </h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Players Selection */}
            <div className="glass-strong rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Players
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {(['2', '3', '4'] as const).map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setFormData({ ...formData, players: count })}
                    className={`rounded-xl border-2 p-4 text-center transition-all ${
                      formData.players === count
                        ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                        : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-2xl font-bold mb-1">{count}</div>
                    <div className="text-sm">players</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Boxes Selection */}
            <div className="glass-strong rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Select Box
              </h2>
              {boxes.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No boxes available</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {boxes.map((box) => {
                    const isSelected = selectedBoxes.includes(box.id);
                    return (
                      <button
                        key={box.id}
                        type="button"
                        onClick={() => toggleBox(box.id)}
                        className={`group relative rounded-xl border-2 p-4 text-left transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-amber-400">
                            <Coins className="w-4 h-4" />
                            <span className="font-bold">{box.price.toLocaleString()}</span>
                          </div>
                          {isSelected && (
                            <div className="px-2 py-1 rounded-full bg-purple-500 text-xs font-bold text-white">
                              Selected
                            </div>
                          )}
                        </div>
                        <h3 className="font-semibold text-white mb-1">{box.name}</h3>
                        <p className="line-clamp-2 text-sm text-gray-400">{box.description}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Win Condition */}
            <div className="glass-strong rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-purple-400" />
                Win Condition
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {winConditions.map((condition) => {
                  const Icon = condition.icon;
                  return (
                    <button
                      key={condition.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, winCondition: condition.value as any })}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${
                        formData.winCondition === condition.value
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-4 h-4 ${formData.winCondition === condition.value ? 'text-purple-400' : 'text-gray-500'}`} />
                        <span className="font-semibold text-white">{condition.label}</span>
                      </div>
                      <p className="text-sm text-gray-400">{condition.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Privacy */}
            <div className="glass-strong rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-400" />
                Privacy
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { value: 'PUBLIC', label: 'Public', description: 'Visible to everyone', icon: Globe },
                  { value: 'PRIVATE', label: 'Private', description: 'Hidden from list', icon: Lock },
                ].map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, privacy: option.value as any })}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${
                        formData.privacy === option.value
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 ${formData.privacy === option.value ? 'text-purple-400' : 'text-gray-500'}`} />
                        <span className="font-semibold text-white">{option.label}</span>
                      </div>
                      <p className="text-sm text-gray-400">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 glass-strong rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Battle Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center py-3 border-b border-gray-800">
                  <span className="text-gray-400">Boxes</span>
                  <span className="text-white font-semibold">
                    {selectedBoxes.length} selected
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-800">
                  <span className="text-gray-400">Players</span>
                  <span className="text-white font-semibold">{formData.players}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-800">
                  <span className="text-gray-400">Mode</span>
                  <span className="text-white font-semibold">
                    {winConditions.find(c => c.value === formData.winCondition)?.label}
                  </span>
                </div>
              </div>

              {/* Rounds Control */}
              <div className="mb-6">
                <span className="text-gray-400 text-sm block mb-3">Rounds</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rounds: Math.max(1, formData.rounds - 1) })}
                    className="w-12 h-12 rounded-xl border border-gray-700 bg-gray-800/50 text-white hover:bg-gray-700 transition-colors flex items-center justify-center"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-bold text-white">{formData.rounds}</span>
                    <span className="text-gray-400 text-sm block">round{formData.rounds !== 1 ? 's' : ''}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rounds: formData.rounds + 1 })}
                    className="w-12 h-12 rounded-xl border border-gray-700 bg-gray-800/50 text-white hover:bg-gray-700 transition-colors flex items-center justify-center"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Total Cost */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 mb-6">
                <span className="text-gray-400 text-sm block mb-1">Entry Cost</span>
                <div className="flex items-center gap-2">
                  <Coins className="w-6 h-6 text-amber-400" />
                  <span className="text-3xl font-bold text-white">{calculateTotalCost().toFixed(0)}</span>
                  <span className="text-gray-400">coins</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || selectedBoxes.length === 0}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Swords className="w-5 h-5" />
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
