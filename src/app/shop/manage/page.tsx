'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { 
  Store, 
  Package, 
  ShoppingBag,
  BarChart3,
  Plus,
  Settings,
  Image as ImageIcon
} from 'lucide-react';

type Shop = {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  banner: string | null;
  isActive: boolean;
  products: any[];
  _count: {
    products: number;
    orders: number;
  };
};

export default function ShopManagePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopDescription, setShopDescription] = useState('');

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const res = await fetch('/api/shop/owner');
        const data = await res.json();
        
        if (res.status === 403) {
          addToast({
            title: 'Access Denied',
            description: 'You need to be a Shop Owner to access this page',
            variant: 'destructive',
          });
          router.push('/shop');
          return;
        }

        if (data.success) {
          setShop(data.shop);
        }
      } catch (error) {
        console.error('Error fetching shop:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShop();
  }, [router, addToast]);

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shopName.trim()) {
      addToast({
        title: 'Error',
        description: 'Shop name is required',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/shop/owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: shopName,
          description: shopDescription || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to create shop',
          variant: 'destructive',
        });
        return;
      }

      addToast({
        title: 'Shop Created!',
        description: 'Your shop has been created successfully',
      });

      // Refresh the page to show the shop
      window.location.reload();
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to create shop',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 flex items-center justify-center font-display">
        <div className="text-white flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  // Show shop creation form if no shop exists
  if (shop === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
        <div className="fixed inset-0 bg-grid opacity-30" />
        <div className="fixed inset-0 radial-gradient" />

        <div className="relative container py-12">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center mx-auto mb-6">
                <Store className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">Create Your Shop</h1>
              <p className="text-gray-400">Set up your shop to start selling TCG products</p>
            </div>

            <form onSubmit={handleCreateShop} className="glass-strong rounded-2xl p-8 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Shop Name *</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass text-white placeholder-gray-500 border border-gray-700 focus:border-emerald-500 focus:outline-none"
                  placeholder="My Awesome Card Shop"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={shopDescription}
                  onChange={(e) => setShopDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl glass text-white placeholder-gray-500 border border-gray-700 focus:border-emerald-500 focus:outline-none resize-none"
                  placeholder="Tell customers about your shop..."
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-cyan-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Shop...
                  </>
                ) : (
                  <>
                    <Store className="w-5 h-5" />
                    Create Shop
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />

      <div className="relative container py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Store className="w-8 h-8 text-emerald-400" />
              <h1 className="text-3xl font-bold text-white">{shop?.name}</h1>
              {shop?.isActive ? (
                <span className="px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium">Active</span>
              ) : (
                <span className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium">Inactive</span>
              )}
            </div>
            <p className="text-gray-400">Manage your shop, products, and orders</p>
          </div>
          <Link
            href="/shop/manage/products/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-cyan-500 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </Link>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-strong rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <Package className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Products</p>
                <p className="text-2xl font-bold text-white">{shop?._count.products || 0}</p>
              </div>
            </div>
          </div>

          <div className="glass-strong rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <ShoppingBag className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Orders</p>
                <p className="text-2xl font-bold text-white">{shop?._count.orders || 0}</p>
              </div>
            </div>
          </div>

          <div className="glass-strong rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <BarChart3 className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Active Products</p>
                <p className="text-2xl font-bold text-white">
                  {shop?.products.filter(p => p.isActive).length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-strong rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/20">
                <ImageIcon className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Featured</p>
                <p className="text-2xl font-bold text-white">
                  {shop?.products.filter(p => p.featured).length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/shop/manage/products" className="glass-strong rounded-2xl p-6 hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors">
                <Package className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Products</h2>
            </div>
            <p className="text-gray-400">Manage your product listings, prices, and inventory</p>
          </Link>

          <Link href="/shop/manage/orders" className="glass-strong rounded-2xl p-6 hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                <ShoppingBag className="w-6 h-6 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Orders</h2>
            </div>
            <p className="text-gray-400">View and manage customer orders and shipping</p>
          </Link>

          <Link href="/shop/manage/settings" className="glass-strong rounded-2xl p-6 hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                <Settings className="w-6 h-6 text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Settings</h2>
            </div>
            <p className="text-gray-400">Update your shop details, logo, and preferences</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
