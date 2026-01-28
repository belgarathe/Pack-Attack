'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Search, Plus, Trash2, X, Check, Loader2, Store, Package, ArrowLeft, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

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
  sourceGame: 'MAGIC_THE_GATHERING' | 'ONE_PIECE' | 'POKEMON' | 'LORCANA' | 'YUGIOH' | 'FLESH_AND_BLOOD';
  scryfallId?: string;
};

export default function CreateShopBoxPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedGame, setSelectedGame] = useState<'MAGIC_THE_GATHERING' | 'ONE_PIECE' | 'POKEMON' | 'LORCANA' | 'YUGIOH' | 'FLESH_AND_BLOOD'>('MAGIC_THE_GATHERING');
  const [apiSource, setApiSource] = useState<'default' | 'justtcg'>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [boxCards, setBoxCards] = useState<CardData[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cardsPerPack: '1',
  });

  // Redirect non-authorized users
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }
    
    if (session.user?.role !== 'ADMIN' && session.user?.role !== 'SHOP_OWNER') {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render content for non-authorized users
  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'SHOP_OWNER')) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  const gameOptions = [
    { value: 'MAGIC_THE_GATHERING', label: 'Magic: The Gathering', defaultApi: 'Scryfall' },
    { value: 'POKEMON', label: 'Pokémon', defaultApi: 'PokemonTCG.io' },
    { value: 'ONE_PIECE', label: 'One Piece', defaultApi: 'JustTCG' },
    { value: 'LORCANA', label: 'Lorcana', defaultApi: 'Lorcana-API' },
    { value: 'YUGIOH', label: 'Yu-Gi-Oh!', defaultApi: 'JustTCG' },
    { value: 'FLESH_AND_BLOOD', label: 'Flesh and Blood', defaultApi: 'JustTCG' },
  ];
  
  const justTCGOnlyGames = ['YUGIOH', 'FLESH_AND_BLOOD'];
  const dualApiGames = ['MAGIC_THE_GATHERING', 'POKEMON', 'LORCANA', 'ONE_PIECE'];

  const searchCards = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const gameMap: Record<string, string> = {
        MAGIC_THE_GATHERING: 'mtg',
        ONE_PIECE: 'onepiece',
        POKEMON: 'pokemon',
        LORCANA: 'lorcana',
        YUGIOH: 'yugioh',
        FLESH_AND_BLOOD: 'fleshblood',
      };

      const effectiveSource = justTCGOnlyGames.includes(selectedGame) ? 'justtcg' : 
                             apiSource === 'justtcg' ? 'justtcg' : '';
      
      const sourceParam = effectiveSource ? `&source=${effectiveSource}` : '';
      const res = await fetch(`/api/cards/search/${gameMap[selectedGame]}?q=${encodeURIComponent(searchQuery)}${sourceParam}`);
      const data = await res.json();

      if (data.success) {
        setSearchResults(data.cards || []);
        if (data.cards?.length === 0) {
          addToast({
            title: 'No Results',
            description: data.message || 'No cards found matching your search',
          });
        }
      } else {
        addToast({
          title: 'Error',
          description: data.message || data.error || 'Failed to search cards',
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
    const cardId = card.id || card.scryfallId;
    const existingCard = boxCards.find(c => c.id === cardId || c.scryfallId === cardId);
    
    if (existingCard) {
      addToast({
        title: 'Card already selected',
        description: `${card.name} is already added to this box`,
        variant: 'destructive',
      });
      return;
    }

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
  };
  
  const clearSearch = () => {
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
    const roundedRate = parseFloat(equalRate.toFixed(3));
    setBoxCards(boxCards.map(card => ({ ...card, pullRate: roundedRate })));
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
      const games = boxCards.length > 0 
        ? [boxCards[0].sourceGame] 
        : ['MAGIC_THE_GATHERING'];

      // Create box using shop API
      const boxRes = await fetch('/api/shop-dashboard/boxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
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
      const cardsRes = await fetch(`/api/shop-dashboard/boxes/${boxData.box.id}/cards`, {
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
        let errorMessage = cardsData.error || 'Failed to add cards to box';
        
        if (cardsData.failedCards && cardsData.failedCards.length > 0) {
          errorMessage += '\n\nFailed cards:\n' + 
            cardsData.failedCards.map((fc: any) => `- ${fc.name}: ${fc.error}`).join('\n');
        }

        addToast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        
        // Delete the box if cards failed
        try {
          await fetch(`/api/shop-dashboard/boxes/${boxData.box.id}`, {
            method: 'DELETE',
          });
        } catch (deleteError) {
          console.error('Failed to delete box after card creation failure:', deleteError);
        }
        
        return;
      }

      addToast({
        title: 'Success',
        description: 'Box created successfully!',
      });

      router.push('/shop-dashboard/boxes');
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
    <div className="min-h-screen font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />
      <div className="fixed top-20 right-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl animate-float" />

      <div className="relative container py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/shop-dashboard" 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-sm">
              <Store className="w-4 h-4 text-teal-400" />
              <span className="text-gray-300">Shop Dashboard</span>
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-2 font-heading">
            <span className="text-white">Create </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">New Box</span>
          </h1>
          <p className="text-gray-400">Build a custom card box with your inventory for users to open.</p>
        </div>

        <div className="glass-strong rounded-2xl overflow-hidden">
          <div className="border-b border-gray-800 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-500/10">
                <Package className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Box Configuration</h2>
                <p className="text-sm text-gray-400">Set up your box details and add cards</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Box Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Box Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Premium MTG Collection"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Price (coins)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    placeholder="e.g., 100"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Description</label>
                <textarea
                  required
                  placeholder="Describe what makes this box special..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none transition-colors resize-none"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Cards Per Pack</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.cardsPerPack}
                    onChange={(e) => setFormData({ ...formData, cardsPerPack: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Card Search */}
              <div className="border-t border-gray-800 pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-cyan-500/10">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Add Cards to Box</h3>
                    <p className="text-sm text-gray-400">Search and add cards from various TCG databases</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3 mb-4">
                  <select
                    value={selectedGame}
                    onChange={(e) => {
                      const game = e.target.value as any;
                      setSelectedGame(game);
                      setApiSource('default');
                      setSearchResults([]);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:border-teal-500 focus:outline-none"
                  >
                    {gameOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  
                  {dualApiGames.includes(selectedGame) && (
                    <select
                      value={apiSource}
                      onChange={(e) => {
                        setApiSource(e.target.value as 'default' | 'justtcg');
                        setSearchResults([]);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:border-teal-500 focus:outline-none"
                    >
                      <option value="default">
                        {gameOptions.find(g => g.value === selectedGame)?.defaultApi || 'Default API'}
                      </option>
                      <option value="justtcg">JustTCG (Prices)</option>
                    </select>
                  )}
                  
                  {justTCGOnlyGames.includes(selectedGame) && (
                    <span className="px-3 py-2.5 rounded-xl bg-blue-900/50 border border-blue-700 text-blue-300 text-sm flex items-center gap-2">
                      <span>📊</span> JustTCG
                    </span>
                  )}
                  
                  <div className="flex-1 min-w-[200px] flex gap-2">
                    <input
                      type="text"
                      placeholder="Search for cards..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), searchCards())}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:border-teal-500 focus:outline-none"
                    />
                    <Button 
                      type="button" 
                      onClick={searchCards} 
                      disabled={searching}
                      className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-6"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      {searching ? 'Searching...' : 'Search'}
                    </Button>
                  </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mb-6 p-4 rounded-xl bg-gray-800/30 border border-gray-700/50 max-h-[500px] overflow-y-auto">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-gray-400">Search Results ({searchResults.length} found) - Click to add:</p>
                      <Button type="button" variant="ghost" size="sm" onClick={clearSearch} className="text-gray-400 hover:text-white">
                        <X className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                      {searchResults.map((card, idx) => {
                        const isSelected = boxCards.some(c => c.id === card.id || c.scryfallId === card.id);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => addCardToBox(card)}
                            className={`relative aspect-[63/88] rounded-xl overflow-hidden border-2 transition-all group ${
                              isSelected ? 'border-teal-500 ring-2 ring-teal-500/50' : 'border-gray-600 hover:border-teal-400'
                            }`}
                          >
                            {card.imageUrl && (
                              <Image
                                src={card.imageUrl}
                                alt={card.name}
                                fill
                                className="object-cover"
                              />
                            )}
                            {isSelected ? (
                              <div className="absolute inset-0 bg-teal-500/30 flex items-center justify-center">
                                <div className="bg-teal-500 rounded-full p-1">
                                  <Check className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                <Plus className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-4">
                              <p className="text-[10px] text-white truncate font-medium">{card.name}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Box Cards List */}
                {boxCards.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/30">
                      <div className="text-sm">
                        <span className="text-gray-400">Total Pull Rate: </span>
                        <span className={`font-bold ${Math.abs(totalRate - 100) < 0.001 ? 'text-teal-400' : 'text-red-400'}`}>
                          {totalRate.toFixed(3)}%
                        </span>
                        {Math.abs(totalRate - 100) >= 0.001 && (
                          <span className="text-gray-500 ml-2">(Must equal 100%)</span>
                        )}
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={distributeRates}
                        className="border-teal-500/50 text-teal-400 hover:bg-teal-500/10"
                      >
                        Distribute Evenly
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                      {boxCards.map((card, index) => (
                        <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-gray-800/30 border border-gray-700/50 hover:border-gray-600 transition-colors">
                          <div className="relative w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-gray-700">
                            {card.imageUrl && (
                              <Image
                                src={card.imageUrl}
                                alt={card.name}
                                fill
                                className="object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{card.name}</p>
                            <p className="text-xs text-gray-500">{card.setName} • {card.rarity}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <label className="text-[10px] text-gray-500 block mb-1">Pull Rate (%)</label>
                              <input
                                type="number"
                                step="0.001"
                                min="0.001"
                                max="100"
                                value={card.pullRate}
                                onChange={(e) => updateCard(index, 'pullRate', parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm text-center focus:border-teal-500 focus:outline-none"
                              />
                            </div>
                            <div className="text-center">
                              <label className="text-[10px] text-gray-500 block mb-1">Coin Value</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={card.coinValue}
                                onChange={(e) => updateCard(index, 'coinValue', parseFloat(e.target.value) || 0.01)}
                                className="w-20 px-2 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm text-center focus:border-teal-500 focus:outline-none"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCard(index)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {highestCard && (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/30">
                        <p className="text-sm text-gray-400 mb-3">Box Display Image (Highest Coin Value Card):</p>
                        <div className="flex items-center gap-4">
                          <div className="relative w-20 h-28 rounded-lg overflow-hidden ring-2 ring-teal-500/50">
                            <Image
                              src={highestCard.imageUrl}
                              alt={highestCard.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-white">{highestCard.name}</p>
                            <p className="text-sm text-teal-400">{highestCard.coinValue} coins</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-6 border-t border-gray-800">
                <Button 
                  type="submit" 
                  disabled={loading || boxCards.length === 0 || Math.abs(totalRate - 100) > 0.001}
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-8"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Box
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.back()}
                  className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
