'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Search, Plus, Trash2, X, Check, Loader2, FolderOpen, Save, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { PresetGallery } from '@/components/admin/PresetGallery';
import { SavePresetModal } from '@/components/admin/SavePresetModal';

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

export default function CreateBoxPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { addToast } = useToast();
  
  // ALL hooks must be called at the top, before any conditional returns
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
    cardsPerPack: '',
  });
  
  // Preset state
  const [showPresetGallery, setShowPresetGallery] = useState(false);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);

  // Redirect non-admin users
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }
    
    if (session.user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render content for non-admin users
  if (!session || session.user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
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
  
  // Games that only support JustTCG
  const justTCGOnlyGames = ['YUGIOH', 'FLESH_AND_BLOOD'];
  
  // Games that support both APIs
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

      // Determine API source - JustTCG-only games always use JustTCG
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
    // Check if card is already in the box
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
    // DON'T clear search results - allow adding multiple cards!
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
    // Round to 3 decimal places
    const roundedRate = parseFloat(equalRate.toFixed(3));
    setBoxCards(boxCards.map(card => ({ ...card, pullRate: roundedRate })));
  };

  // Load preset into form
  const loadPreset = (preset: any) => {
    // Set form data
    setFormData({
      name: preset.boxName || '',
      description: preset.boxDescription || '',
      price: String(preset.price) || '',
      cardsPerPack: String(preset.cardsPerPack) || '',
    });

    // Set game from preset
    if (preset.games && preset.games.length > 0) {
      setSelectedGame(preset.games[0]);
    }

    // Load cards from preset
    const cards: CardData[] = (preset.cardsConfig || []).map((card: any) => ({
      id: card.scryfallId,
      name: card.name,
      setName: card.setName,
      setCode: card.setCode,
      collectorNumber: card.collectorNumber,
      rarity: card.rarity,
      imageUrl: card.imageUrl,
      pullRate: card.pullRate,
      coinValue: card.coinValue,
      sourceGame: card.sourceGame,
      scryfallId: card.scryfallId,
    }));

    setBoxCards(cards);
    setSearchResults([]);
    setSearchQuery('');
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
        // Show detailed error information
        let errorMessage = cardsData.error || 'Failed to add cards to box';
        
        if (cardsData.failedCards && cardsData.failedCards.length > 0) {
          errorMessage += '\n\nFailed cards:\n' + 
            cardsData.failedCards.map((fc: any) => `- ${fc.name}: ${fc.error}`).join('\n');
        }
        
        if (cardsData.details) {
          errorMessage += '\n\n' + cardsData.details;
        }

        addToast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        
        // Delete the box if cards failed to add
        try {
          await fetch(`/api/admin/boxes/${boxData.box.id}`, {
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Create New Box</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPresetGallery(true)}
                  className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Load Preset
                </Button>
                {boxCards.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSavePresetModal(true)}
                    className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save as Preset
                  </Button>
                )}
              </div>
            </div>
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
                    step="0.01"
                    required
                    min="0.01"
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
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <select
                    value={selectedGame}
                    onChange={(e) => {
                      const game = e.target.value as any;
                      setSelectedGame(game);
                      setApiSource('default');
                      setSearchResults([]);
                    }}
                    className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
                  >
                    {gameOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  
                  {/* API Source Dropdown - only show for games that support both APIs */}
                  {dualApiGames.includes(selectedGame) && (
                    <select
                      value={apiSource}
                      onChange={(e) => {
                        setApiSource(e.target.value as 'default' | 'justtcg');
                        setSearchResults([]);
                      }}
                      className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
                      title="Select card data source"
                    >
                      <option value="default">
                        {gameOptions.find(g => g.value === selectedGame)?.defaultApi || 'Default API'}
                      </option>
                      <option value="justtcg">JustTCG (Prices)</option>
                    </select>
                  )}
                  
                  {/* Show JustTCG badge for JustTCG-only games */}
                  {justTCGOnlyGames.includes(selectedGame) && (
                    <span className="px-3 py-2 rounded-lg bg-blue-900/50 border border-blue-700 text-blue-300 text-sm">
                      📊 JustTCG
                    </span>
                  )}
                  
                  <input
                    type="text"
                    placeholder="Search for cards..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), searchCards())}
                    className="flex-1 min-w-[200px] px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-primary focus:outline-none"
                  />
                  <Button type="button" onClick={searchCards} disabled={searching}>
                    <Search className="h-4 w-4 mr-2" />
                    {searching ? 'Searching...' : 'Search'}
                  </Button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mb-6 p-4 rounded-lg bg-gray-800 border border-gray-700 max-h-[500px] overflow-y-auto">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-gray-400">Search Results ({searchResults.length} found) - Click to add:</p>
                      <Button type="button" variant="ghost" size="sm" onClick={clearSearch}>
                        <X className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                      {searchResults.map((card, idx) => {
                        const isSelected = boxCards.some(c => c.id === card.id || c.scryfallId === card.id);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => addCardToBox(card)}
                            className={`relative aspect-[63/88] rounded-lg overflow-hidden border-2 transition-all group ${
                              isSelected ? 'border-green-500 ring-2 ring-green-500/50' : 'border-gray-600 hover:border-primary'
                            }`}
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
                            {isSelected ? (
                              <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                                <div className="bg-green-500 rounded-full p-1">
                                  <Check className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                <Plus className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2">
                              <p className="text-xs text-white truncate">{card.name}</p>
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
                                step="0.01"
                                min="0.01"
                                value={card.coinValue}
                                onChange={(e) => updateCard(index, 'coinValue', parseFloat(e.target.value) || 0.01)}
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
                {boxCards.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowSavePresetModal(true)}
                    className="ml-auto text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Save as Preset
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Preset Gallery Modal */}
      <PresetGallery
        isOpen={showPresetGallery}
        onClose={() => setShowPresetGallery(false)}
        onSelectPreset={loadPreset}
      />

      {/* Save Preset Modal */}
      <SavePresetModal
        isOpen={showSavePresetModal}
        onClose={() => setShowSavePresetModal(false)}
        boxData={formData}
        boxCards={boxCards}
      />
    </div>
  );
}
