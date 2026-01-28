'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Store, Package, ArrowLeft, Save, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

type Card = {
  id: string;
  name: string;
  setName: string;
  rarity: string;
  imageUrlGatherer: string;
  pullRate: number;
  coinValue: number;
};

type Box = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  cardsPerPack: number;
  isActive: boolean;
  cards: Card[];
};

export default function EditShopBoxPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [box, setBox] = useState<Box | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cardsPerPack: '',
    isActive: true,
  });

  // Fetch box data
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }
    
    if (session.user?.role !== 'ADMIN' && session.user?.role !== 'SHOP_OWNER') {
      router.push('/dashboard');
      return;
    }

    fetchBox();
  }, [session, status, resolvedParams.id, router]);

  const fetchBox = async () => {
    try {
      const res = await fetch(`/api/shop-dashboard/boxes/${resolvedParams.id}`);
      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to load box',
          variant: 'destructive',
        });
        router.push('/shop-dashboard/boxes');
        return;
      }

      setBox(data.box);
      setFormData({
        name: data.box.name,
        description: data.box.description,
        price: String(Number(data.box.price)),
        cardsPerPack: String(data.box.cardsPerPack),
        isActive: data.box.isActive,
      });
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to load box',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/shop-dashboard/boxes/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          cardsPerPack: parseInt(formData.cardsPerPack),
          isActive: formData.isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to update box',
          variant: 'destructive',
        });
        return;
      }

      addToast({
        title: 'Success',
        description: 'Box updated successfully',
      });
      router.push('/shop-dashboard/boxes');
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to update box',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading box...</p>
        </div>
      </div>
    );
  }

  if (!box) {
    return null;
  }

  return (
    <div className="min-h-screen font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />

      <div className="relative container py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/shop-dashboard/boxes" 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Boxes</span>
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-sm">
              <Store className="w-4 h-4 text-cyan-400" />
              <span className="text-gray-300">Shop Dashboard</span>
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-2 font-heading">
            <span className="text-white">Edit </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Box</span>
          </h1>
          <p className="text-gray-400">Update your box details and settings.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Box Preview */}
          <div className="lg:col-span-1">
            <div className="glass-strong rounded-2xl overflow-hidden sticky top-24">
              <div className="relative aspect-[4/3] bg-gray-800">
                {box.imageUrl ? (
                  <Image
                    src={box.imageUrl}
                    alt={box.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package className="w-16 h-16 text-gray-700" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-white mb-2">{box.name}</h3>
                <p className="text-sm text-gray-400 mb-4">{box.cards.length} cards in this box</p>
                
                {/* Card Preview Grid */}
                <div className="grid grid-cols-4 gap-1">
                  {box.cards.slice(0, 8).map((card) => (
                    <div key={card.id} className="relative aspect-[63/88] rounded overflow-hidden">
                      <Image
                        src={card.imageUrlGatherer}
                        alt={card.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
                {box.cards.length > 8 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">+{box.cards.length - 8} more cards</p>
                )}
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            <div className="glass-strong rounded-2xl p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Box Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Description</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Price (coins)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Cards Per Pack</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.cardsPerPack}
                      onChange={(e) => setFormData({ ...formData, cardsPerPack: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-800/30">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900"
                  />
                  <label htmlFor="isActive" className="text-gray-300 cursor-pointer">
                    <span className="font-medium">Active</span>
                    <p className="text-sm text-gray-500">When active, users can see and open this box</p>
                  </label>
                </div>

                <div className="flex gap-4 pt-4 border-t border-gray-800">
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
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
    </div>
  );
}
