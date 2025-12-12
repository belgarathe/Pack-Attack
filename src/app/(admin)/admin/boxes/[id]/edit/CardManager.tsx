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
    const collectorNum = card.collectorNumber || card.collector_number || card.number || '';
    const setCode = card.setCode || card.set || card.set_code || '';
    
    // Create a unique ID that includes set and collector number to distinguish variants
    const uniqueId = `${card.id}-${setCode}-${collectorNum}`.toLowerCase().replace(/\s+/g, '-');
    
    const newCard: CardData = {
      id: card.id,
      name: card.name,
      setName: card.setName || card.set_name || '',
      setCode: setCode,
      collectorNumber: collectorNum,
      rarity: card.rarity || 'common',
      imageUrl: card.imageUrl || card.image_url || card.image || '',
      pullRate: 0,
      coinValue: 1,
      sourceGame: selectedGame,
      scryfallId: uniqueId, // Use unique ID that includes set + collector number
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

  const redistributeExistingRates = async () => {
    if (existingCards.length === 0) return;
    
    const equalRate = 100 / existingCards.length;
    // Round to 3 decimal places
    const roundedRate = parseFloat(equalRate.toFixed(3));
    
    if (!confirm(`This will set all ${existingCards.length} cards to ${roundedRate}% pull rate each. Continue?`)) {
      return;
    }

    try {
      // Update all existing cards with equal rates
      const updatePromises = existingCards.map(card => 
        fetch(`/api/admin/boxes/${boxId}/cards/${card.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pullRate: roundedRate,
            coinValue: card.coinValue,
          }),
        })
      );

      await Promise.all(updatePromises);
      
      addToast({
        title: 'Success',
        description: `Redistributed pull rates evenly across ${existingCards.length} cards`,
      });

      onCardsChange();
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to redistribute rates',
        variant: 'destructive',
      });
    }
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

    // Validate all cards have coin values
    for (const card of newCards) {
      if (card.coinValue <= 0) {
        addToast({
          title: 'Validation Error',
          description: `Please set a coin value for ${card.name}`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Calculate pull rates
    const existingTotal = existingCards.reduce((sum, card) => sum + card.pullRate, 0);
    let newCardsToAdd = [...newCards];
    
    // If new cards don't have pull rates set, or if we need to redistribute
    if (existingCards.length > 0) {
      // We have existing cards, need to handle rate distribution
      const newCardsNeedRate = newCardsToAdd.some(card => card.pullRate <= 0);
      
      // Calculate what space is available
      const availableSpace = Math.max(0, 100 - existingTotal);
      
      if (newCardsNeedRate || availableSpace < 0.001) {
        // If no space available or cards need rates, assign minimal rates
        // These will need to be adjusted by the admin later
        const minimalRate = availableSpace > 0 ? availableSpace / newCardsToAdd.length : 0.001;
        newCardsToAdd = newCardsToAdd.map(card => ({
          ...card,
          pullRate: card.pullRate > 0 ? Math.min(card.pullRate, minimalRate) : minimalRate
        }));
      }
      
      const newTotal = newCardsToAdd.reduce((sum, card) => sum + card.pullRate, 0);
      const projectedTotal = existingTotal + newTotal;
      
      // Show warning and ask for confirmation
      let confirmMessage = `Adding ${newCards.length} new card(s):\n\n` +
        `Current cards total: ${existingTotal.toFixed(3)}%\n` +
        `New cards will add: ${newTotal.toFixed(3)}%\n` +
        `Final total: ${projectedTotal.toFixed(3)}%\n\n`;
        
      if (projectedTotal > 100.001) {
        // Will exceed 100%, need to use minimal rates
        const minimalTotal = newCardsToAdd.length * 0.001;
        confirmMessage += `⚠️ Total would exceed 100%. New cards will be added with minimal rates (0.001% each = ${minimalTotal.toFixed(3)}% total).\n\n`;
        confirmMessage += `You MUST adjust all card rates after adding to ensure they total exactly 100%.\n\n`;
        
        // Set all new cards to minimal rate
        newCardsToAdd = newCardsToAdd.map(card => ({
          ...card,
          pullRate: 0.001
        }));
      } else if (Math.abs(projectedTotal - 100) > 0.001) {
        confirmMessage += `⚠️ After adding, total will be ${projectedTotal.toFixed(3)}%.\n`;
        confirmMessage += `You'll need to adjust card rates to total exactly 100%.\n\n`;
      }
      
      confirmMessage += `Do you want to proceed?`;
      
      if (!confirm(confirmMessage)) {
        return;
      }
    } else {
      // No existing cards, ensure new cards total 100%
      const newTotal = newCardsToAdd.reduce((sum, card) => sum + card.pullRate, 0);
      
      if (newTotal <= 0) {
        // Auto-distribute evenly
        const ratePerCard = 100 / newCardsToAdd.length;
        newCardsToAdd = newCardsToAdd.map(card => ({
          ...card,
          pullRate: ratePerCard
        }));
      } else if (Math.abs(newTotal - 100) > 0.001) {
        addToast({
          title: 'Validation Error',
          description: `When adding cards to an empty box, total pull rate must be exactly 100%. Current: ${newTotal.toFixed(3)}%`,
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      // Ensure all cards have valid pull rates before sending
      const cardsToSend = newCardsToAdd.map(card => ({
        scryfallId: card.scryfallId || card.id || card.name,
        name: card.name,
        setName: card.setName,
        setCode: card.setCode,
        collectorNumber: card.collectorNumber,
        rarity: card.rarity,
        imageUrlGatherer: card.imageUrl || '',
        imageUrlScryfall: card.imageUrl || '',
        pullRate: Math.max(0.001, card.pullRate || 0.001), // Ensure minimum valid rate
        coinValue: Math.max(1, card.coinValue || 1), // Ensure minimum valid coin value
        sourceGame: card.sourceGame,
      }));

      const res = await fetch(`/api/admin/boxes/${boxId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cards: cardsToSend,
        }),
      });

      let data: any = {};
      
      try {
        const text = await res.text();
        if (text) {
          data = JSON.parse(text);
        }
      } catch (e) {
        console.error('Failed to parse response:', e);
      }

      // Handle error responses - use status code as primary indicator
      if (!res.ok) {
        
        // Check for specific status codes first (Turbopack bug workaround)
        if (res.status === 400) {
          // Could be duplicate cards or validation error
          const errorMsg = data?.error || 'The card(s) you are trying to add already exist in this box. Please search for a different card.';
          addToast({
            title: 'Cards Already Exist',
            description: errorMsg,
            variant: 'destructive',
          });
          setNewCards([]);
          onCardsChange();
          return;
        }

        if (res.status === 401) {
          addToast({
            title: 'Unauthorized',
            description: 'Please sign in again as admin to add cards.',
            variant: 'destructive',
          });
          return;
        }
        
        if (res.status === 403) {
          addToast({
            title: 'Forbidden',
            description: 'You do not have permission to add cards.',
            variant: 'destructive',
          });
          return;
        }
        
        if (res.status === 404) {
          addToast({
            title: 'Not Found',
            description: 'The box was not found.',
            variant: 'destructive',
          });
          return;
        }
        
        // Show the error message (include status for clarity)
        addToast({
          title: 'Failed to Add Cards',
          description: data?.error || data?.message || `Request failed with status ${res.status}`,
          variant: 'destructive',
        });
        
        return;
      }

      // Handle response with more detail
      if (data.message) {
        addToast({
          title: 'Cards Processed',
          description: data.message,
        });
      } else if (data.warning) {
        addToast({
          title: 'Cards Added - Adjustment Needed',
          description: data.warning,
        });
      } else {
        addToast({
          title: 'Success',
          description: `Added ${data.addedCount || newCards.length} card(s) to box`,
        });
      }

      if (data.skippedExisting && data.skippedExisting.length > 0) {
        addToast({
          title: 'Note',
          description: `${data.skippedExisting.length} card(s) were already in the box and skipped`,
          variant: 'default',
        });
      }

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
              <p className="text-sm text-gray-400 mb-2">Search Results ({searchResults.length} found):</p>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[500px] overflow-y-auto p-2 bg-gray-800/50 rounded-lg">
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
                <div className="text-sm text-gray-400">
                  <p>
                    New Cards Pull Rate: <span className={totalRate === 0 ? 'text-gray-500' : 'text-white'}>{totalRate.toFixed(3)}%</span>
                  </p>
                  {existingCards.length > 0 && (
                    <p className="text-xs mt-1">
                      {existingCards.reduce((sum, c) => sum + c.pullRate, 0) >= 99.999 ? (
                        <span className="text-yellow-500">⚠️ Box is at 100%. Cards will be added with minimal rates.</span>
                      ) : totalRate > 0 && totalRate + existingCards.reduce((sum, c) => sum + c.pullRate, 0) > 100 ? (
                        <span className="text-yellow-500">⚠️ Total would exceed 100%. Rates will be adjusted.</span>
                      ) : (
                        <span className="text-gray-500">Cards will be added as configured.</span>
                      )}
                    </p>
                  )}
                </div>
                <Button onClick={handleAddNewCards} disabled={newCards.length === 0}>
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
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-400">
                  Total Pull Rate: <span className={Math.abs(existingCards.reduce((sum, c) => sum + c.pullRate, 0) - 100) < 0.001 ? 'text-green-500' : 'text-yellow-500'}>
                    {existingCards.reduce((sum, c) => sum + c.pullRate, 0).toFixed(3)}%
                  </span>
                </p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={redistributeExistingRates}
                  title="Distribute pull rates evenly across all cards"
                >
                  Redistribute Evenly
                </Button>
              </div>
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
                        
                        {/* Action buttons - ALWAYS VISIBLE */}
                        <div className="absolute bottom-2 left-2 right-2 flex gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEditCard(card)}
                            className="flex-1 h-8 bg-blue-600 hover:bg-blue-700 text-white"
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
                  <div className="mt-2 space-y-2">
                    <p className="text-sm font-semibold text-white truncate text-center" title={card.name}>
                      {card.name}
                    </p>
                    {/* Always show current values with quick edit */}
                    <div className="bg-gray-800 rounded p-2 space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Coin Value:</span>
                        <span className="text-yellow-500 font-bold">{card.coinValue}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Pull Rate:</span>
                        <span className="text-white font-bold">{card.pullRate.toFixed(3)}%</span>
                      </div>
                    </div>
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

