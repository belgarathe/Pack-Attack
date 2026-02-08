'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Card {
  id: string;
  name: string;
  rarity: string;
  imageUrl: string;
  pullRate: number;
  coinValue: number;
}

interface Box {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  cardsPerPack: number;
  cards: Card[];
}

export default function EditBoxPage() {
  const params = useParams();
  const router = useRouter();
  const boxId = params.id as string;
  
  const [box, setBox] = useState<Box | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadBox();
  }, [boxId]);

  const loadBox = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/boxes/${boxId}`);
      if (!res.ok) throw new Error('Failed to load box');
      const data = await res.json();
      console.log('Box loaded:', data);
      setBox(data);
    } catch (error) {
      console.error('Failed to load box:', error);
      alert('Failed to load box');
    } finally {
      setLoading(false);
    }
  };

  const searchCards = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const res = await fetch(`/api/cards/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResults(data.cards || []);
    } catch (error) {
      console.error('Search failed:', error);
      // Use mock results for testing
      setSearchResults([
        {
          id: `search-${Date.now()}-1`,
          name: `${searchQuery} Card 1`,
          rarity: 'Rare',
          imageUrl: 'https://cards.scryfall.io/art_crop/front/f/e/feefe9f0-24a6-461c-9ef1-86c5a6f33b83.jpg',
          pullRate: 10,
          coinValue: 10
        },
        {
          id: `search-${Date.now()}-2`,
          name: `${searchQuery} Card 2`,
          rarity: 'Common',
          imageUrl: 'https://cards.scryfall.io/art_crop/front/0/6/06ec9e8b-4bd8-4caf-a559-6514b7ab4ca4.jpg',
          pullRate: 5,
          coinValue: 5
        }
      ]);
    } finally {
      setSearching(false);
    }
  };

  const addCard = (card: Card) => {
    if (!box) return;
    
    // Check if card already exists
    const existingCard = box.cards.find(c => c.name === card.name);
    if (existingCard) {
      alert(`"${card.name}" is already in the box`);
      return;
    }

    // Add card with default low pull rate (admin can adjust later)
    const newCard = {
      ...card,
      id: `${card.id}-${Date.now()}`, // Ensure unique ID
      pullRate: 5, // Start with 5% default
      coinValue: card.coinValue || 1
    };

    setBox({
      ...box,
      cards: [...box.cards, newCard]
    });

    // Clear search
    setSearchResults([]);
    setSearchQuery('');
    
    console.log('✅ Card added:', newCard.name);
    
    // Show helpful message about pull rate
    const currentTotal = box.cards.reduce((sum, c) => sum + c.pullRate, 0) + 5;
    console.log(`Current total pull rate: ${currentTotal}% (adjust to reach 100% before saving)`);
  };

  const removeCard = (cardId: string) => {
    if (!box) return;
    
    const card = box.cards.find(c => c.id === cardId);
    if (confirm(`Remove "${card?.name}" from the box?`)) {
      setBox({
        ...box,
        cards: box.cards.filter(c => c.id !== cardId)
      });
      console.log('✅ Card removed');
    }
  };

  const updateCard = (cardId: string, field: 'pullRate' | 'coinValue', value: number) => {
    if (!box) return;
    
    // Ensure valid values
    const validValue = field === 'pullRate' 
      ? Math.max(0, Math.min(100, value)) // Pull rate: 0-100
      : Math.max(1, Math.floor(value));    // Coin value: minimum 1
    
    console.log(`📝 Updating ${field} for card ${cardId}: ${validValue}`);
    
    const updatedBox = {
      ...box,
      cards: box.cards.map(card => 
        card.id === cardId 
          ? { ...card, [field]: validValue }
          : card
      )
    };
    
    setBox(updatedBox);
    
    // Show current total if pull rate changed
    if (field === 'pullRate') {
      const total = updatedBox.cards.reduce((sum, card) => sum + card.pullRate, 0);
      console.log(`Total pull rate: ${total.toFixed(2)}%`);
    }
  };

  const distributeEvenly = () => {
    if (!box || box.cards.length === 0) return;
    
    const rate = 100 / box.cards.length;
    setBox({
      ...box,
      cards: box.cards.map(card => ({
        ...card,
        pullRate: parseFloat(rate.toFixed(2))
      }))
    });
    console.log(`✅ Pull rates distributed evenly: ${rate.toFixed(2)}% each`);
  };

  const distributeByRarity = () => {
    if (!box || box.cards.length === 0) return;
    
    const rarityWeights: Record<string, number> = {
      'Common': 50,
      'Uncommon': 30,
      'Rare': 15,
      'Mythic': 4,
      'Legendary': 1
    };

    // Count cards per rarity
    const cardsByRarity: Record<string, number> = {};
    box.cards.forEach(card => {
      cardsByRarity[card.rarity] = (cardsByRarity[card.rarity] || 0) + 1;
    });

    // Calculate total weight
    let totalWeight = 0;
    Object.entries(cardsByRarity).forEach(([rarity, count]) => {
      totalWeight += (rarityWeights[rarity] || 10) * count;
    });

    // Distribute pull rates
    const updatedCards = box.cards.map(card => {
      const weight = rarityWeights[card.rarity] || 10;
      const pullRate = (weight / totalWeight) * 100;
      return { ...card, pullRate: parseFloat(pullRate.toFixed(2)) };
    });

    setBox({ ...box, cards: updatedCards });
    console.log('✅ Pull rates distributed by rarity');
  };

  const saveBox = async () => {
    if (!box) return;

    // Validate pull rates ONLY when saving
    const totalPullRate = box.cards.reduce((sum, card) => sum + card.pullRate, 0);
    
    if (box.cards.length > 0 && Math.abs(totalPullRate - 100) > 0.01) {
      const response = confirm(
        `⚠️ Total pull rate is ${totalPullRate.toFixed(2)}% instead of 100%.\n\n` +
        `This will affect drop rates!\n\n` +
        `Click OK to save anyway, or Cancel to adjust pull rates.`
      );
      
      if (!response) {
        return; // Don't save, let user adjust
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/boxes/${boxId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(box)
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to save box');
      
      console.log('✅ Box saved successfully!', data);
      alert(`✅ Box saved successfully!\nTotal pull rate: ${totalPullRate.toFixed(2)}%`);
      
      router.push('/admin/boxes');
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save box. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">Loading box...</div>
          <div className="text-gray-400">Please wait</div>
        </div>
      </div>
    );
  }

  if (!box) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">Box not found</div>
          <button 
            onClick={() => router.push('/admin/boxes')}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            Back to Boxes
          </button>
        </div>
      </div>
    );
  }

  const totalPullRate = box.cards.reduce((sum, card) => sum + card.pullRate, 0);
  const isValidPullRate = Math.abs(totalPullRate - 100) < 0.01;
  const totalCoinValue = box.cards.reduce((sum, card) => sum + card.coinValue, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Edit Box: {box.name}</h1>
              <div className="flex gap-4 mt-2 text-sm">
                <span className={`${isValidPullRate ? 'text-green-400' : 'text-yellow-400'}`}>
                  Total Pull Rate: {totalPullRate.toFixed(2)}%
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-yellow-400">
                  Total Coins: 💎 {totalCoinValue}
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-400">
                  Cards: {box.cards.length}
                </span>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/admin/boxes')}
                className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveBox}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2"
              >
                {saving ? 'Saving...' : 'Save All Changes'}
                {!isValidPullRate && box.cards.length > 0 && (
                  <span className="text-yellow-300">⚠️</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Box Information */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Box Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2">Box Name</label>
              <input
                type="text"
                value={box.name}
                onChange={(e) => setBox({ ...box, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Description</label>
              <textarea
                value={box.description}
                onChange={(e) => setBox({ ...box, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">Price (Coins)</label>
                <input
                  type="number"
                  value={box.price}
                  onChange={(e) => setBox({ ...box, price: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm mb-2">Cards per Pack</label>
                <input
                  type="number"
                  value={box.cardsPerPack}
                  onChange={(e) => setBox({ ...box, cardsPerPack: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2">Image URL</label>
              <input
                type="text"
                value={box.imageUrl}
                onChange={(e) => setBox({ ...box, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Cards Management */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            Cards Management
          </h2>

          {/* Card Search */}
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search for cards to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchCards()}
                className="flex-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={searchCards}
                disabled={searching}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {searching ? '...' : 'Search'}
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 bg-gray-700 rounded p-2 max-h-40 overflow-y-auto">
                {searchResults.map((card) => (
                  <div key={card.id} className="flex justify-between items-center p-2 hover:bg-gray-600 rounded">
                    <div>
                      <span className="font-medium">{card.name}</span>
                      <span className="ml-2 text-sm text-gray-400">({card.rarity})</span>
                    </div>
                    <button
                      onClick={() => addCard(card)}
                      className="px-3 py-1 bg-green-600 rounded text-sm hover:bg-green-700 transition"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {box.cards.length > 0 && (
            <div className="mb-4 flex gap-2">
              <button
                onClick={distributeEvenly}
                className="px-3 py-1 bg-purple-600 rounded text-sm hover:bg-purple-700 transition"
                title="Distribute pull rates evenly across all cards"
              >
                Distribute Evenly
              </button>
              <button
                onClick={distributeByRarity}
                className="px-3 py-1 bg-purple-600 rounded text-sm hover:bg-purple-700 transition"
                title="Distribute pull rates based on rarity"
              >
                By Rarity
              </button>
            </div>
          )}

          {/* Cards List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {box.cards.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No cards in this box yet.</p>
                <p className="text-sm mt-2">Search and add cards above.</p>
              </div>
            ) : (
              box.cards.map((card, index) => (
                <div key={card.id} className="bg-gray-700 rounded p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{card.name}</div>
                      <div className="text-sm text-gray-400">{card.rarity}</div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Pull Rate */}
                      <div className="flex flex-col items-center">
                        <label className="text-xs text-gray-400 mb-1">Pull %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={card.pullRate}
                          onChange={(e) => updateCard(card.id, 'pullRate', parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 bg-gray-600 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      {/* Coin Value */}
                      <div className="flex flex-col items-center">
                        <label className="text-xs text-gray-400 mb-1">💎 Coins</label>
                        <input
                          type="number"
                          min="1"
                          value={card.coinValue}
                          onChange={(e) => updateCard(card.id, 'coinValue', parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 bg-gray-600 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                      </div>
                      
                      {/* Remove Button */}
                      <button
                        onClick={() => removeCard(card.id)}
                        className="px-2 py-1 bg-red-600 rounded text-sm hover:bg-red-700 transition ml-2"
                        title="Remove card"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Summary */}
          {box.cards.length > 0 && (
            <div className="mt-4 p-3 bg-gray-700 rounded">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Cards:</span>
                  <span className="font-semibold">{box.cards.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Coins:</span>
                  <span className="font-semibold text-yellow-400">💎 {totalCoinValue}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pull Rate Sum:</span>
                  <span className={`font-semibold ${isValidPullRate ? 'text-green-400' : 'text-yellow-400'}`}>
                    {totalPullRate.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={`font-semibold ${isValidPullRate ? 'text-green-400' : 'text-yellow-400'}`}>
                    {isValidPullRate ? '✅ Ready' : '⚠️ Adjust'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}