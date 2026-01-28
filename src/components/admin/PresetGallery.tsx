'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Loader2, 
  Package, 
  Coins, 
  Layers, 
  Trash2, 
  Eye,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PresetPreviewModal } from './PresetPreviewModal';

type BoxPreset = {
  id: string;
  name: string;
  description: string | null;
  boxName: string;
  price: number;
  cardsPerPack: number;
  games: string[];
  thumbnailUrl: string | null;
  previewImages: string[];
  cardCount: number;
  createdAt: string;
};

type PresetGalleryProps = {
  onSelectPreset: (preset: any) => void;
  isOpen: boolean;
  onClose: () => void;
};

const gameLabels: Record<string, string> = {
  MAGIC_THE_GATHERING: 'MTG',
  ONE_PIECE: 'One Piece',
  POKEMON: 'Pokémon',
  LORCANA: 'Lorcana',
  YUGIOH: 'Yu-Gi-Oh!',
  FLESH_AND_BLOOD: 'FaB',
};

const gameColors: Record<string, string> = {
  MAGIC_THE_GATHERING: 'bg-gradient-to-r from-amber-600 to-yellow-500',
  ONE_PIECE: 'bg-gradient-to-r from-red-600 to-orange-500',
  POKEMON: 'bg-gradient-to-r from-yellow-500 to-amber-400',
  LORCANA: 'bg-gradient-to-r from-purple-600 to-indigo-500',
  YUGIOH: 'bg-gradient-to-r from-blue-600 to-cyan-500',
  FLESH_AND_BLOOD: 'bg-gradient-to-r from-red-700 to-rose-500',
};

export function PresetGallery({ onSelectPreset, isOpen, onClose }: PresetGalleryProps) {
  const [presets, setPresets] = useState<BoxPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewPreset, setPreviewPreset] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchPresets();
    }
  }, [isOpen]);

  const fetchPresets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/box-presets');
      const data = await res.json();
      if (data.success) {
        setPresets(data.presets);
      }
    } catch (error) {
      console.error('Failed to fetch presets:', error);
      addToast({
        title: 'Error',
        description: 'Failed to load presets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this preset?')) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/box-presets/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (data.success) {
        setPresets(presets.filter(p => p.id !== id));
        addToast({
          title: 'Success',
          description: 'Preset deleted successfully',
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to delete preset',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  const handlePreview = async (preset: BoxPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/admin/box-presets/${preset.id}`);
      const data = await res.json();
      if (data.success) {
        setPreviewPreset(data.preset);
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to load preset details',
        variant: 'destructive',
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleLoadPreset = async (preset: BoxPreset) => {
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/admin/box-presets/${preset.id}`);
      const data = await res.json();
      if (data.success) {
        onSelectPreset(data.preset);
        onClose();
        addToast({
          title: 'Preset Loaded',
          description: `"${preset.name}" has been loaded into the form`,
        });
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to load preset',
        variant: 'destructive',
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Box Presets</h2>
                  <p className="text-sm text-gray-400">Select a template to load into box creation</p>
                </div>
              </div>
              <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white">
                Close
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : presets.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Presets Yet</h3>
                <p className="text-gray-400">
                  Create your first preset by filling out the box form and clicking "Save as Preset"
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {presets.map((preset) => (
                  <Card
                    key={preset.id}
                    className="bg-gray-800/50 border-gray-700 hover:border-primary/50 transition-all cursor-pointer group overflow-hidden"
                    onClick={() => handleLoadPreset(preset)}
                  >
                    {/* Preview Images */}
                    <div className="relative h-40 bg-gradient-to-br from-gray-800 to-gray-900">
                      {preset.previewImages.length > 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                          <div className="flex -space-x-8">
                            {preset.previewImages.slice(0, 4).map((img, idx) => (
                              <div
                                key={idx}
                                className="relative w-20 h-28 rounded-lg overflow-hidden border-2 border-gray-700 shadow-lg transition-transform group-hover:scale-105"
                                style={{
                                  transform: `rotate(${(idx - 1.5) * 5}deg)`,
                                  zIndex: 4 - idx,
                                }}
                              >
                                <Image
                                  src={img}
                                  alt={`Preview ${idx + 1}`}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Package className="h-12 w-12 text-gray-600" />
                        </div>
                      )}
                      
                      {/* Game Badge */}
                      <div className="absolute top-2 left-2 flex gap-1">
                        {preset.games.slice(0, 2).map((game) => (
                          <span
                            key={game}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${gameColors[game] || 'bg-gray-600'}`}
                          >
                            {gameLabels[game] || game}
                          </span>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 bg-gray-900/80 hover:bg-gray-800 text-gray-300"
                          onClick={(e) => handlePreview(preset, e)}
                          disabled={loadingPreview}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 bg-gray-900/80 hover:bg-red-900/80 text-gray-300 hover:text-red-400"
                          onClick={(e) => handleDelete(preset.id, e)}
                          disabled={deleting === preset.id}
                        >
                          {deleting === preset.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-white mb-1 truncate">{preset.name}</h3>
                      <p className="text-sm text-gray-400 truncate mb-3">
                        {preset.description || preset.boxName}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3 text-gray-400">
                          <span className="flex items-center gap-1">
                            <Layers className="h-4 w-4" />
                            {preset.cardCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Coins className="h-4 w-4 text-amber-500" />
                            {Number(preset.price).toLocaleString()}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewPreset && (
        <PresetPreviewModal
          preset={previewPreset}
          onClose={() => setPreviewPreset(null)}
          onLoad={() => {
            onSelectPreset(previewPreset);
            setPreviewPreset(null);
            onClose();
            addToast({
              title: 'Preset Loaded',
              description: `"${previewPreset.name}" has been loaded into the form`,
            });
          }}
        />
      )}
    </>
  );
}
