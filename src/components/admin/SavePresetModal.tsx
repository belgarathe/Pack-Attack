'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  X, 
  Save,
  Loader2,
  Sparkles,
  Package,
  Coins,
  Layers
} from 'lucide-react';

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
  sourceGame: string;
  scryfallId?: string;
};

type SavePresetModalProps = {
  isOpen: boolean;
  onClose: () => void;
  boxData: {
    name: string;
    description: string;
    price: string;
    cardsPerPack: string;
  };
  boxCards: CardData[];
  onSaved?: () => void;
};

export function SavePresetModal({ isOpen, onClose, boxData, boxCards, onSaved }: SavePresetModalProps) {
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  if (!isOpen) return null;

  // Get games from cards
  const games = [...new Set(boxCards.map(c => c.sourceGame))];
  
  // Get preview images (top 4 by coin value)
  const sortedCards = [...boxCards].sort((a, b) => b.coinValue - a.coinValue);
  const previewCards = sortedCards.slice(0, 4);

  const handleSave = async () => {
    if (!presetName.trim()) {
      addToast({
        title: 'Error',
        description: 'Please enter a preset name',
        variant: 'destructive',
      });
      return;
    }

    if (boxCards.length === 0) {
      addToast({
        title: 'Error',
        description: 'Cannot save preset without cards',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/box-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: presetName.trim(),
          description: presetDescription.trim() || null,
          boxName: boxData.name,
          boxDescription: boxData.description,
          price: parseFloat(boxData.price) || 0,
          cardsPerPack: parseInt(boxData.cardsPerPack) || 1,
          games: games.length > 0 ? games : ['MAGIC_THE_GATHERING'],
          cardsConfig: boxCards.map(card => ({
            scryfallId: card.scryfallId || card.id,
            name: card.name,
            setName: card.setName,
            setCode: card.setCode,
            collectorNumber: card.collectorNumber,
            rarity: card.rarity,
            imageUrl: card.imageUrl,
            pullRate: card.pullRate,
            coinValue: card.coinValue,
            sourceGame: card.sourceGame,
          })),
        }),
      });

      const data = await res.json();

      if (data.success) {
        addToast({
          title: 'Preset Saved!',
          description: `"${presetName}" has been saved and can be loaded for future boxes`,
        });
        setPresetName('');
        setPresetDescription('');
        onClose();
        onSaved?.();
      } else {
        throw new Error(data.error || 'Failed to save preset');
      }
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.message || 'Failed to save preset',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
                <Save className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Save as Preset</h2>
                <p className="text-sm text-gray-400">Save this box configuration for quick reuse</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Preview Section */}
        <div className="p-6 bg-gray-800/50 border-b border-gray-700">
          <div className="flex items-start gap-6">
            {/* Card Preview */}
            <div className="flex -space-x-6">
              {previewCards.map((card, idx) => (
                <div
                  key={idx}
                  className="relative w-16 h-24 rounded-lg overflow-hidden border-2 border-gray-700 shadow-lg"
                  style={{
                    transform: `rotate(${(idx - 1.5) * 5}deg)`,
                    zIndex: 4 - idx,
                  }}
                >
                  {card.imageUrl && (
                    <Image
                      src={card.imageUrl}
                      alt={card.name}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Box Info */}
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-2">{boxData.name || 'Untitled Box'}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Layers className="h-4 w-4" />
                  {boxCards.length} cards
                </span>
                <span className="flex items-center gap-1">
                  <Coins className="h-4 w-4 text-amber-500" />
                  {parseFloat(boxData.price) || 0} coins
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {boxData.cardsPerPack || 1}/pack
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-white">
              Preset Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="e.g., Standard MTG Box, Pokemon Starter..."
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white">
              Description <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              value={presetDescription}
              onChange={(e) => setPresetDescription(e.target.value)}
              placeholder="Add notes about this preset..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-blue-300 font-medium">What gets saved:</p>
                <ul className="text-blue-200/70 mt-1 space-y-1">
                  <li>• Box name, description, price, and cards per pack</li>
                  <li>• All {boxCards.length} cards with their pull rates and coin values</li>
                  <li>• Game type: {games.map(g => g.replace(/_/g, ' ')).join(', ')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !presetName.trim()}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Preset
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
