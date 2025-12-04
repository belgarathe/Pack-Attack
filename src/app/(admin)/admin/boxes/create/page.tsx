'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Search, Plus, Trash2, X, Check } from 'lucide-react';
import Image from 'next/image';

type CardData = {
  id: string;
  name: string;
  setName: string;
  setCode: string;
  collectorNumber: string;
  rarity: string;
  imageUrl: string;
  pullRate: number;
  coinValue: number;
  sourceGame: 'MAGIC_THE_GATHERING' | 'ONE_PIECE' | 'POKEMON' | 'LORCANA';
  scryfallId?: string;
};

export default function CreateBoxPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedGame, setSelectedGame] = useState<'MAGIC_THE_GATHERING' | 'ONE_PIECE' | 'POKEMON' | 'LORCANA'>('MAGIC_THE_GATHERING');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [boxCards, setBoxCards] = useState<CardData[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cardsPerPack: '',
  });

  const gameOptions = [
    { value: 'MAGIC_THE_GATHERING', label: 'Magic: The Gathering' },
    { value: 'ONE_PIECE', label: 'One Piece' },
    { value: 'POKEMON', label: 'Pokémon' },
    { value: 'LORCANA', label: 'Lorcana' },
  ];

  const searchCards = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const gameMap: Record<string, string> = {
        MAGIC_THE_GATHERING: 'mtg',
        ONE_PIECE: 'onepiece',
        POKEMON: 'pokemon',
        LORCANA: 'lorcana',
      };

      const res = await fetch(`/api/cards/search/${gameMap[selectedGame]}?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();

      if (data.success) {
        setSearchResults(data.cards || []);
      } else {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to search cards',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      addToast({
        title: 'Error',
        description: 'Failed to search cards',
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  };

  const addCardToBox = (card: any) => {
    const newCard: CardData = {
      id: card.id,
      name: card.name,
      setName: card.setName || card.set_name || '',
      setCode: card.setCode || card.set || card.set_code || '',
      collectorNumber: card.collectorNumber || card.collector_number || card.number || '',
      rarity: card.rarity || 'common',
      imageUrl: card.imageUrl || card.image_url || card.image || '',
      pullRate: 0,
      coinValue: 1,
      sourceGame: selectedGame,
      scryfallId: card.id,
    };
    setBoxCards([...boxCards, newCard]);
    setSearchResults([]);
    setSearchQuery('');
  };

  const removeCard = (index: number) => {
    setBoxCards(boxCards.filter((_, i) => i !== index));
  };

  const updateCard = (index: number, field: 'pullRate' | 'coinValue', value: number) => {
    const updated = [...boxCards];
    updated[index] = { ...updated[index], [field]: value };
    setBoxCards(updated);
  };

  const calculateTotalRate = () => {
    return boxCards.reduce((sum, card) => sum + card.pullRate, 0);
  };

  const distributeRates = () => {
    if (boxCards.length === 0) return;
    const equalRate = 100 / boxCards.length;
    setBoxCards(boxCards.map(card => ({ ...card, pullRate: equalRate })));
  };

  const getHighestValueCard = () => {
    if (boxCards.length === 0) return null;
    return boxCards.reduce((highest, card) => 
      card.coinValue > highest.coinValue ? card : highest
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (boxCards.length === 0) {
      addToast({
        title: 'Error',
        description: 'Please add at least one card to the box',
        variant: 'destructive',
      });
      return;
    }

    const totalRate = calculateTotalRate();
    if (Math.abs(totalRate - 100) > 0.001) {
      addToast({
        title: 'Error',
        description: `Total pull rate must be exactly 100%. Current: ${totalRate.toFixed(3)}%`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Determine game from added cards
      const games = boxCards.length > 0 
        ? [boxCards[0].sourceGame] 
        : ['MAGIC_THE_GATHERING'];

      // Create box
      const boxRes = await fetch('/api/admin/boxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseInt(formData.price),
          cardsPerPack: parseInt(formData.cardsPerPack),
          games: games,
          imageUrl: getHighestValueCard()?.imageUrl || '',
        }),
      });

      const boxData = await boxRes.json();

      if (!boxRes.ok) {
        addToast({
          title: 'Error',
          description: boxData.error || 'Failed to create box',
          variant: 'destructive',
        });
        return;
      }

      // Add cards to box
      const cardsRes = await fetch(`/api/admin/boxes/${boxData.box.id}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cards: boxCards.map(card => ({
            scryfallId: card.scryfallId || card.id,
            name: card.name,
            setName: card.setName,
            setCode: card.setCode,
            collectorNumber: card.collectorNumber,
            rarity: card.rarity,
            imageUrlGatherer: card.imageUrl,
            imageUrlScryfall: card.imageUrl,
            pullRate: card.pullRate,
            coinValue: card.coinValue,
            sourceGame: card.sourceGame,
          })),
        }),
      });

      const cardsData = await cardsRes.json();

      if (!cardsRes.ok) {
        addToast({
          title: 'Error',
          description: cardsData.error || 'Failed to add cards to box',
          variant: 'destructive',
        });
        return;
      }

      addToast({
        title: 'Success',
        description: 'Box created successfully!',
      });

      // Redirect to box overview/edit page
      router.push('/admin/boxes'); // Redirect to overview after creation
    } catch (error) {
      console.error('Error creating box:', error);
      addToast({
        title: 'Error',
        description: 'Failed to create box',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const totalRate = calculateTotalRate();
  const highestCard = getHighestValueCard();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="container py-12">
        <Card className="max-w-6xl mx-auto border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">Create New Box</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Box Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Box Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Price (coins)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white">Description</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-primary focus:outline-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white">Cards Per Pack</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.cardsPerPack}
                  onChange={(e) => setFormData({ ...formData, cardsPerPack: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-primary focus:outline-none"
                />
              </div>

              {/* Card Search */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Add Cards to Box</h3>
                
                <div className="flex gap-2 mb-4">
                  <select
                    value={selectedGame}
                    onChange={(e) => setSelectedGame(e.target.value as any)}
                    className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
                  >
                    {gameOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Search for cards..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), searchCards())}
                    className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-primary focus:outline-none"
                  />
                  <Button type="button" onClick={searchCards} disabled={searching}>
                    <Search className="h-4 w-4 mr-2" />
                    {searching ? 'Searching...' : 'Search'}
                  </Button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mb-6 p-4 rounded-lg bg-gray-800 border border-gray-700 max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {searchResults.map((card, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => addCardToBox(card)}
                          className="relative aspect-[63/88] rounded-lg overflow-hidden border-2 border-gray-600 hover:border-primary transition-all group"
                        >
                          {card.imageUrl && (
                            <Image
                              src={card.imageUrl}
                              alt={card.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <Plus className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2">
                            <p className="text-xs text-white truncate">{card.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Box Cards List */}
                {boxCards.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-400">
                        Total Pull Rate: <span className={`font-bold ${Math.abs(totalRate - 100) < 0.001 ? 'text-green-500' : 'text-red-500'}`}>
                          {totalRate.toFixed(3)}%
                        </span>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={distributeRates}>
                        Distribute Evenly
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {boxCards.map((card, index) => (
                        <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-gray-800 border border-gray-700">
                          <div className="relative w-16 h-24 rounded overflow-hidden flex-shrink-0">
                            {card.imageUrl && (
                              <Image
                                src={card.imageUrl}
                                alt={card.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white truncate">{card.name}</p>
                            <p className="text-xs text-gray-400">{card.setName} • {card.rarity}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div>
                              <label className="text-xs text-gray-400">Pull Rate (%)</label>
                              <input
                                type="number"
                                step="0.001"
                                min="0.001"
                                max="100"
                                value={card.pullRate}
                                onChange={(e) => updateCard(index, 'pullRate', parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white text-sm focus:border-primary focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400">Coin Value</label>
                              <input
                                type="number"
                                min="1"
                                value={card.coinValue}
                                onChange={(e) => updateCard(index, 'coinValue', parseInt(e.target.value) || 1)}
                                className="w-24 px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white text-sm focus:border-primary focus:outline-none"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCard(index)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {highestCard && (
                      <div className="p-4 rounded-lg bg-primary/10 border border-primary/50">
                        <p className="text-sm text-gray-400 mb-2">Box Display Image (Highest Coin Value Card):</p>
                        <div className="flex items-center gap-4">
                          <div className="relative w-24 h-36 rounded overflow-hidden">
                            <Image
                              src={highestCard.imageUrl}
                              alt={highestCard.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-white">{highestCard.name}</p>
                            <p className="text-sm text-gray-400">{highestCard.coinValue} coins</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-700">
                <Button type="submit" disabled={loading || boxCards.length === 0 || Math.abs(totalRate - 100) > 0.001}>
                  {loading ? 'Creating...' : 'Create Box'}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
