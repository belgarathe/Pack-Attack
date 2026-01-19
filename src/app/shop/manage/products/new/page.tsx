'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { 
  Package, 
  ArrowLeft,
  Plus,
  X,
  Image as ImageIcon
} from 'lucide-react';

const categories = [
  { value: 'SINGLE_CARD', label: 'Single Card' },
  { value: 'BOOSTER_BOX', label: 'Booster Box' },
  { value: 'BOOSTER_PACK', label: 'Booster Pack' },
  { value: 'STARTER_DECK', label: 'Starter Deck' },
  { value: 'STRUCTURE_DECK', label: 'Structure Deck' },
  { value: 'ACCESSORIES', label: 'Accessories' },
  { value: 'SLEEVES', label: 'Sleeves' },
  { value: 'PLAYMAT', label: 'Playmat' },
  { value: 'BINDER', label: 'Binder' },
  { value: 'DECK_BOX', label: 'Deck Box' },
  { value: 'OTHER', label: 'Other' },
];

const games = [
  { value: '', label: 'No specific game' },
  { value: 'MAGIC_THE_GATHERING', label: 'Magic: The Gathering' },
  { value: 'ONE_PIECE', label: 'One Piece' },
  { value: 'POKEMON', label: 'Pokémon' },
  { value: 'LORCANA', label: 'Lorcana' },
  { value: 'YUGIOH', label: 'Yu-Gi-Oh!' },
  { value: 'FLESH_AND_BLOOD', label: 'Flesh and Blood' },
];

const conditions = [
  { value: 'MINT', label: 'Mint' },
  { value: 'NEAR_MINT', label: 'Near Mint' },
  { value: 'EXCELLENT', label: 'Excellent' },
  { value: 'GOOD', label: 'Good' },
  { value: 'LIGHT_PLAYED', label: 'Light Played' },
  { value: 'PLAYED', label: 'Played' },
  { value: 'POOR', label: 'Poor' },
];

export default function NewProductPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    comparePrice: '',
    images: [] as string[],
    category: 'SINGLE_CARD',
    game: '',
    condition: 'NEAR_MINT',
    stock: '1',
    sku: '',
    featured: false,
  });

  const addImage = () => {
    if (imageUrl.trim()) {
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, imageUrl.trim()],
      }));
      setImageUrl('');
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.category) {
      addToast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/shop/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          price: parseFloat(formData.price),
          comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : null,
          images: formData.images,
          category: formData.category,
          game: formData.game || null,
          condition: formData.condition,
          stock: parseInt(formData.stock) || 0,
          sku: formData.sku || null,
          featured: formData.featured,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to create product',
          variant: 'destructive',
        });
        return;
      }

      addToast({
        title: 'Product Created!',
        description: 'Your product has been added to the shop',
      });

      router.push('/shop/manage/products');
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to create product',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />

      <div className="relative container py-12">
        {/* Breadcrumb */}
        <Link href="/shop/manage/products" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>

        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Package className="w-8 h-8 text-emerald-400" />
            <h1 className="text-3xl font-bold text-white">Add New Product</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="glass-strong rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl glass text-white placeholder-gray-500 border border-gray-700 focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g., Charizard VMAX - Rainbow Rare"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl glass text-white placeholder-gray-500 border border-gray-700 focus:border-emerald-500 focus:outline-none resize-none"
                  placeholder="Describe your product..."
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl glass text-white border border-gray-700 focus:border-emerald-500 focus:outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value} className="bg-gray-900">
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Game</label>
                  <select
                    value={formData.game}
                    onChange={(e) => setFormData({ ...formData, game: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl glass text-white border border-gray-700 focus:border-emerald-500 focus:outline-none"
                  >
                    {games.map((game) => (
                      <option key={game.value} value={game.value} className="bg-gray-900">
                        {game.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Condition</label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl glass text-white border border-gray-700 focus:border-emerald-500 focus:outline-none"
                >
                  {conditions.map((cond) => (
                    <option key={cond.value} value={cond.value} className="bg-gray-900">
                      {cond.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pricing */}
            <div className="glass-strong rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Pricing & Inventory</h2>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Price (€) *</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl glass text-white placeholder-gray-500 border border-gray-700 focus:border-emerald-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Compare Price (€)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.comparePrice}
                    onChange={(e) => setFormData({ ...formData, comparePrice: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl glass text-white placeholder-gray-500 border border-gray-700 focus:border-emerald-500 focus:outline-none"
                    placeholder="Original price for discount display"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl glass text-white placeholder-gray-500 border border-gray-700 focus:border-emerald-500 focus:outline-none"
                    placeholder="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">SKU (Optional)</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl glass text-white placeholder-gray-500 border border-gray-700 focus:border-emerald-500 focus:outline-none"
                    placeholder="Product SKU"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-5 h-5 rounded bg-gray-800 border-gray-600 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="featured" className="text-gray-300">Feature this product (shown in featured section)</label>
              </div>
            </div>

            {/* Images */}
            <div className="glass-strong rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Images</h2>
              
              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl glass text-white placeholder-gray-500 border border-gray-700 focus:border-emerald-500 focus:outline-none"
                  placeholder="Enter image URL"
                />
                <button
                  type="button"
                  onClick={addImage}
                  className="px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {formData.images.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-800">
                      <img
                        src={image}
                        alt={`Product ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs">
                          Main
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-xl">
                  <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No images added yet</p>
                  <p className="text-gray-500 text-sm">Add image URLs above</p>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Link
                href="/shop/manage/products"
                className="flex-1 py-4 glass text-gray-300 font-semibold rounded-xl hover:bg-white/10 transition-colors text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-cyan-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Create Product
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
