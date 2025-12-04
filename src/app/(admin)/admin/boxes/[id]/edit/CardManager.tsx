'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Search, Plus, Trash2, X, Edit2, Save, XCircle } from 'lucide-react';
import Image from 'next/image';
import { Coins } from 'lucide-react';

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

type BoxCard = {
  id: string;
  name: string;
  imageUrlGatherer: string;
  coinValue: number;
  pullRate: number;
  rarity: string;
};

type CardManagerProps = {
  boxId: string;
  existingCards: BoxCard[];
  onCardsChange: () => void;
};

export function CardManager({ boxId, existingCards, onCardsChange }: CardManagerProps) {
  const { addToast } = useToast();
  const [searching, setSearching] = useState(false);
  const [selectedGame, setSelectedGame] = useState<'MAGIC_THE_GATHERING' | 'ONE_PIECE' | 'POKEMON' | 'LORCANA'>('MAGIC_THE_GATHERING');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [newCards, setNewCards] = useState<CardData[]>([]);
  const [removingCardId, setRemovingCardId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ pullRate: number; coinValue: number }>({ pullRate: 0, coinValue: 1 });
  const [savingCard, setSavingCard] = useState(false);

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
    setNewCards([...newCards, newCard]);
    setSearchResults([]);
    setSearchQuery('');
  };

  const removeNewCard = (index: number) => {
    setNewCards(newCards.filter((_, i) => i !== index));
  };

  const updateNewCard = (index: number, field: keyof CardData, value: any) => {
    const updated = [...newCards];
    updated[index] = { ...updated[index], [field]: value };
    setNewCards(updated);
  };

  const calculateTotalRate = () => {
    const existingTotal = existingCards.reduce((sum, card) => sum + card.pullRate, 0);
    const newTotal = newCards.reduce((sum, card) => sum + card.pullRate, 0);
    return existingTotal + newTotal;
  };

  const handleRemoveCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to remove this card from the box?')) {
      return;
    }

    setRemovingCardId(cardId);
    try {
      const res = await fetch(`/api/admin/boxes/${boxId}/cards/${cardId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove card');
      }

      addToast({
        title: 'Success',
        description: 'Card removed from box. Note: Total pull rate may no longer equal 100%. Please adjust remaining cards\' pull rates.',
      });

      onCardsChange();
    } catch (error) {
      addToast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setRemovingCardId(null);
    }
  };

  const handleEditCard = (card: BoxCard) => {
    setEditingCardId(card.id);
    setEditValues({ pullRate: card.pullRate, coinValue: card.coinValue });
  };

  const handleCancelEdit = () => {
    setEditingCardId(null);
    setEditValues({ pullRate: 0, coinValue: 1 });
  };

  const handleSaveCardEdit = async () => {
    if (!editingCardId || !editValues) return;

    // Validate values
    if (editValues.pullRate <= 0 || editValues.pullRate > 100) {
      addToast({
        title: 'Validation Error',
        description: 'Pull rate must be between 0.001 and 100',
        variant: 'destructive',
      });
      return;
    }

    if (editValues.coinValue <= 0) {
      addToast({
        title: 'Validation Error',
        description: 'Coin value must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    setSavingCard(true);
    try {
      const res = await fetch(`/api/admin/boxes/${boxId}/cards/${editingCardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pullRate: editValues.pullRate,
          coinValue: editValues.coinValue,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update card');
      }

      addToast({
        title: 'Success',
        description: 'Card updated successfully',
      });

      handleCancelEdit();
      onCardsChange();
    } catch (error) {
      addToast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSavingCard(false);
    }
  };

  const handleAddNewCards = async () => {
    if (newCards.length === 0) {
      addToast({
        title: 'No cards to add',
        description: 'Please add cards from search results first',
        variant: 'destructive',
      });
      return;
    }

    // Validate all cards have pull rates and coin values
    for (const card of newCards) {
      if (card.pullRate <= 0) {
        addToast({
          title: 'Validation Error',
          description: `Please set a pull rate for ${card.name}`,
          variant: 'destructive',
        });
        return;
      }
      if (card.coinValue <= 0) {
        addToast({
          title: 'Validation Error',
          description: `Please set a coin value for ${card.name}`,
          variant: 'destructive',
        });
        return;
      }
    }

    // When adding new cards, we need to adjust existing cards' pull rates proportionally
    // OR the admin needs to manually adjust to ensure total = 100%
    // For now, we'll require the admin to ensure the total is 100% before adding
    const existingTotal = existingCards.reduce((sum, card) => sum + card.pullRate, 0);
    const newTotal = newCards.reduce((sum, card) => sum + card.pullRate, 0);
    const totalRate = existingTotal + newTotal;
    
    if (Math.abs(totalRate - 100) > 0.001) {
      addToast({
        title: 'Validation Error',
        description: `Total pull rate must be exactly 100%. Current: ${totalRate.toFixed(3)}% (Existing: ${existingTotal.toFixed(3)}% + New: ${newTotal.toFixed(3)}%). Please adjust pull rates to make the total exactly 100%.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const res = await fetch(`/api/admin/boxes/${boxId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cards: newCards.map(card => ({
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

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add cards');
      }

      addToast({
        title: 'Success',
        description: `Added ${newCards.length} card(s) to box`,
      });

      setNewCards([]);
      onCardsChange();
    } catch (error) {
      addToast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const totalRate = calculateTotalRate();

  return (
    <div className="space-y-6">
      {/* Search for new cards */}
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-white">Add New Cards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value as any)}
              className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-primary focus:outline-none"
            >
              {gameOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchCards()}
              placeholder="Search for cards..."
              className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-primary focus:outline-none"
            />
            <Button onClick={searchCards} disabled={searching}>
              <Search className="h-4 w-4 mr-2" />
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-2">Search Results:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {searchResults.map((card, idx) => (
                  <div key={idx} className="relative group">
                    <div className="relative aspect-[63/88] rounded-lg overflow-hidden border-2 border-gray-700 hover:border-primary transition-all cursor-pointer"
                      onClick={() => addCardToBox(card)}
                    >
                      {card.imageUrl || card.image_url || card.image ? (
                        <Image
                          src={card.imageUrl || card.image_url || card.image}
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
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all flex items-center justify-center">
                        <Plus className="h-6 w-6 text-white opacity-0 group-hover:opacity-100" />
                      </div>
                    </div>
                    <p className="text-xs text-white mt-1 truncate" title={card.name}>{card.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Cards to Add */}
          {newCards.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-2">Cards to Add:</p>
              <div className="space-y-2">
                {newCards.map((card, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg">
                    <div className="relative w-16 h-24 rounded overflow-hidden flex-shrink-0">
                      {card.imageUrl ? (
                        <Image
                          src={card.imageUrl}
                          alt={card.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-700" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{card.name}</p>
                      <div className="flex gap-4 mt-2">
                        <div className="flex-1">
                          <label className="text-xs text-gray-400">Pull Rate %</label>
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            max="100"
                            value={card.pullRate}
                            onChange={(e) => updateNewCard(index, 'pullRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 rounded bg-gray-900 border border-gray-700 text-white text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-400">Coin Value</label>
                          <input
                            type="number"
                            min="1"
                            value={card.coinValue}
                            onChange={(e) => updateNewCard(index, 'coinValue', parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1 rounded bg-gray-900 border border-gray-700 text-white text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNewCard(index)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Total Pull Rate: <span className={Math.abs(totalRate - 100) < 0.001 ? 'text-green-500' : 'text-red-500'}>{totalRate.toFixed(3)}%</span>
                  {Math.abs(totalRate - 100) >= 0.001 && (
                    <span className="text-red-500 ml-2">(Must be exactly 100%)</span>
                  )}
                </p>
                <Button onClick={handleAddNewCards} disabled={Math.abs(totalRate - 100) >= 0.001}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add {newCards.length} Card(s)
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Cards */}
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Existing Cards ({existingCards.length})</CardTitle>
            {existingCards.length > 0 && (
              <p className="text-sm text-gray-400">
                Total Pull Rate: <span className={Math.abs(existingCards.reduce((sum, c) => sum + c.pullRate, 0) - 100) < 0.001 ? 'text-green-500' : 'text-yellow-500'}>
                  {existingCards.reduce((sum, c) => sum + c.pullRate, 0).toFixed(3)}%
                </span>
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {existingCards.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No cards in this box yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {existingCards.map((card) => (
                <div key={card.id} className="relative group">
                  <div className="relative aspect-[63/88] rounded-lg overflow-hidden border-2 border-gray-700 hover:border-primary transition-all">
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
                    
                    {/* Show edit interface if this card is being edited */}
                    {editingCardId === card.id ? (
                      <div className="absolute inset-0 bg-black/90 flex flex-col justify-center p-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-300">Pull Rate %</label>
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            max="100"
                            value={editValues.pullRate}
                            onChange={(e) => setEditValues({ ...editValues, pullRate: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-300">Coin Value</label>
                          <input
                            type="number"
                            min="1"
                            value={editValues.coinValue}
                            onChange={(e) => setEditValues({ ...editValues, coinValue: parseInt(e.target.value) || 1 })}
                            className="w-full px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white text-sm"
                          />
                        </div>
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            onClick={handleSaveCardEdit}
                            disabled={savingCard}
                            className="flex-1 h-7"
                          >
                            <Save className="h-3 w-3 mr-1" />
                            {savingCard ? '...' : 'Save'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={savingCard}
                            className="flex-1 h-7"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="absolute top-2 left-2 bg-black/80 rounded px-2 py-1 flex items-center gap-1">
                          <Coins className="h-3 w-3 text-yellow-500" />
                          <span className="text-xs font-bold text-yellow-500">
                            {card.coinValue.toLocaleString()}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2 bg-black/80 rounded px-2 py-1">
                          <span className="text-xs font-bold text-white">
                            {card.pullRate.toFixed(3)}%
                          </span>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="absolute bottom-2 left-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEditCard(card)}
                            className="flex-1 h-8"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveCard(card.id)}
                            disabled={removingCardId === card.id}
                            className="flex-1 h-8"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            {removingCardId === card.id ? '...' : 'Remove'}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-sm font-semibold text-white truncate" title={card.name}>
                      {card.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

