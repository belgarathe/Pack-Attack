'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Minus, Coins } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

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
      // For now, create battle with first selected box
      // In future, you can enhance to support multiple boxes
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
    {
      value: 'NORMAL',
      label: 'Highest Total Value',
      description: 'The player/team with the highest total value wins',
    },
    {
      value: 'UPSIDE_DOWN',
      label: 'Lowest Total Value',
      description: 'The player/team with the lowest total value wins',
    },
    {
      value: 'SHARE',
      label: 'Share Mode',
      description: 'Items are evenly distributed to all players/teams',
    },
    {
      value: 'JACKPOT',
      label: 'Jackpot',
      description: 'Provably fair roll weighted by each player\'s total value. One player wins all items.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="container py-12">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/battles">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Link>
          </Button>
        </div>

        <h1 className="mb-8 text-4xl font-bold text-white">Create Battle</h1>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Players Selection */}
            <Card className="border-gray-800 bg-gray-900/50">
              <CardHeader>
                <CardTitle>Players</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {(['2', '3', '4'] as const).map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setFormData({ ...formData, players: count })}
                      className={`rounded-lg border-2 p-4 text-center transition-all ${
                        formData.players === count
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <div className="text-2xl font-bold">
                        {count === '2' ? '1 vs 1' : count === '3' ? '1 vs 1 vs 1' : '1 vs 1 vs 1 vs 1'}
                      </div>
                      <div className="text-sm">{count} players</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Boxes Selection */}
            <Card className="border-gray-800 bg-gray-900/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Boxes</CardTitle>
                  <div className="text-sm text-gray-400">Sort by Coin</div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {boxes.length === 0 ? (
                    <p className="text-center text-gray-400">No boxes available</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {boxes.map((box) => {
                        const isSelected = selectedBoxes.includes(box.id);
                        return (
                          <button
                            key={box.id}
                            type="button"
                            onClick={() => toggleBox(box.id)}
                            className={`group relative overflow-hidden rounded-lg border-2 p-4 text-left transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/10'
                                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                            }`}
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Coins className="h-4 w-4 text-yellow-500" />
                                <span className="font-semibold text-white">{box.price.toLocaleString()}</span>
                              </div>
                              {isSelected && (
                                <div className="rounded-full bg-primary px-2 py-1 text-xs font-bold text-white">
                                  Selected
                                </div>
                              )}
                            </div>
                            <h3 className="mb-2 font-semibold text-white">{box.name}</h3>
                            <p className="line-clamp-2 text-sm text-gray-400">{box.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Win Condition */}
            <Card className="border-gray-800 bg-gray-900/50">
              <CardHeader>
                <CardTitle>Win Condition</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {winConditions.map((condition) => (
                    <button
                      key={condition.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, winCondition: condition.value as any })}
                      className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                        formData.winCondition === condition.value
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className="font-semibold text-white">{condition.label}</div>
                      <div className="text-sm text-gray-400">{condition.description}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Privacy */}
            <Card className="border-gray-800 bg-gray-900/50">
              <CardHeader>
                <CardTitle>Privacy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { value: 'PUBLIC', label: 'Public', description: 'Battle is visible to everyone' },
                    { value: 'PRIVATE', label: 'Private', description: 'Battle is hidden from the battle list' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, privacy: option.value as any })}
                      className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                        formData.privacy === option.value
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className="font-semibold text-white">{option.label}</div>
                      <div className="text-sm text-gray-400">{option.description}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 border-gray-800 bg-gray-900/50">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-2 text-sm text-gray-400">Boxes / Rounds:</div>
                  <div className="text-lg font-semibold text-white">
                    {selectedBoxes.length} box{selectedBoxes.length !== 1 ? 'es' : ''} × {formData.rounds} round{formData.rounds !== 1 ? 's' : ''}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-sm text-gray-400">Players:</div>
                  <div className="text-lg font-semibold text-white">{formData.players}</div>
                </div>
                <div>
                  <div className="mb-2 text-sm text-gray-400">Battle Price:</div>
                  <div className="flex items-center gap-2 text-lg font-semibold text-white">
                    <Coins className="h-5 w-5 text-yellow-500" />
                    {calculateTotalCost().toFixed(2)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setFormData({ ...formData, rounds: Math.max(1, formData.rounds - 1) })}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex flex-1 items-center justify-center text-white">
                    {formData.rounds} Round{formData.rounds !== 1 ? 's' : ''}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setFormData({ ...formData, rounds: formData.rounds + 1 })}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={loading || selectedBoxes.length === 0}
                >
                  {loading ? 'Creating...' : `Create Battle for Coin${calculateTotalCost().toFixed(2)}`}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
