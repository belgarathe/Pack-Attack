'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { 
  Package, 
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Search,
  Star,
  Eye,
  EyeOff
} from 'lucide-react';

type Product = {
  id: string;
  name: string;
  price: number;
  images: string[];
  category: string;
  stock: number;
  isActive: boolean;
  featured: boolean;
};

const categoryDisplayNames: Record<string, string> = {
  SINGLE_CARD: 'Single Card',
  BOOSTER_BOX: 'Booster Box',
  BOOSTER_PACK: 'Booster Pack',
  STARTER_DECK: 'Starter Deck',
  STRUCTURE_DECK: 'Structure Deck',
  ACCESSORIES: 'Accessories',
  SLEEVES: 'Sleeves',
  PLAYMAT: 'Playmat',
  BINDER: 'Binder',
  DECK_BOX: 'Deck Box',
  OTHER: 'Other',
};

export default function ManageProductsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/shop/owner');
        const data = await res.json();
        
        if (res.status === 403) {
          router.push('/shop');
          return;
        }

        if (data.success && data.shop) {
          setProducts(data.shop.products || []);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [router]);

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    setDeleting(productId);
    try {
      const res = await fetch(`/api/shop/products/${productId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        addToast({
          title: 'Error',
          description: data.error || 'Failed to delete product',
          variant: 'destructive',
        });
        return;
      }

      setProducts((prev) => prev.filter((p) => p.id !== productId));
      addToast({
        title: 'Deleted',
        description: 'Product has been deleted',
      });
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  const toggleActive = async (product: Product) => {
    try {
      const res = await fetch(`/api/shop/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !product.isActive }),
      });

      if (!res.ok) {
        throw new Error('Failed to update');
      }

      setProducts((prev) => prev.map((p) => 
        p.id === product.id ? { ...p, isActive: !p.isActive } : p
      ));

      addToast({
        title: product.isActive ? 'Deactivated' : 'Activated',
        description: `Product is now ${product.isActive ? 'hidden' : 'visible'}`,
      });
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to update product',
        variant: 'destructive',
      });
    }
  };

  const toggleFeatured = async (product: Product) => {
    try {
      const res = await fetch(`/api/shop/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !product.featured }),
      });

      if (!res.ok) {
        throw new Error('Failed to update');
      }

      setProducts((prev) => prev.map((p) => 
        p.id === product.id ? { ...p, featured: !p.featured } : p
      ));

      addToast({
        title: product.featured ? 'Unfeatured' : 'Featured',
        description: `Product ${product.featured ? 'removed from' : 'added to'} featured list`,
      });
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to update product',
        variant: 'destructive',
      });
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 flex items-center justify-center font-display">
        <div className="text-white flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Loading products...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />

      <div className="relative container py-12">
        {/* Breadcrumb */}
        <Link href="/shop/manage" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-emerald-400" />
            <h1 className="text-3xl font-bold text-white">Products</h1>
            <span className="px-3 py-1 rounded-full bg-gray-700/50 text-gray-300 text-sm">
              {products.length} total
            </span>
          </div>
          <Link
            href="/shop/manage/products/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-cyan-500 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl glass-strong text-white placeholder-gray-500 border border-gray-700 focus:border-emerald-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Products Table */}
        {filteredProducts.length === 0 ? (
          <div className="glass-strong rounded-2xl p-12 text-center">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              {searchQuery ? 'No Products Found' : 'No Products Yet'}
            </h2>
            <p className="text-gray-400 mb-6">
              {searchQuery ? 'Try a different search term' : 'Add your first product to get started'}
            </p>
            {!searchQuery && (
              <Link
                href="/shop/manage/products/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl"
              >
                <Plus className="w-5 h-5" />
                Add Product
              </Link>
            )}
          </div>
        ) : (
          <div className="glass-strong rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Product</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Category</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Price</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Stock</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Status</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                            {product.images[0] ? (
                              <Image
                                src={product.images[0]}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-gray-600" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{product.name}</p>
                            {product.featured && (
                              <span className="inline-flex items-center gap-1 text-amber-400 text-xs">
                                <Star className="w-3 h-3" /> Featured
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-300">
                          {categoryDisplayNames[product.category] || product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-emerald-400 font-semibold">
                          €{product.price.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={product.stock > 0 ? 'text-green-400' : 'text-red-400'}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          product.isActive 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {product.isActive ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleFeatured(product)}
                            className={`p-2 rounded-lg transition-colors ${
                              product.featured 
                                ? 'text-amber-400 hover:bg-amber-500/20' 
                                : 'text-gray-400 hover:bg-gray-700/50'
                            }`}
                            title={product.featured ? 'Remove from featured' : 'Add to featured'}
                          >
                            <Star className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleActive(product)}
                            className={`p-2 rounded-lg transition-colors ${
                              product.isActive 
                                ? 'text-green-400 hover:bg-green-500/20' 
                                : 'text-gray-400 hover:bg-gray-700/50'
                            }`}
                            title={product.isActive ? 'Hide product' : 'Show product'}
                          >
                            {product.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <Link
                            href={`/shop/manage/products/${product.id}/edit`}
                            className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-colors"
                            title="Edit product"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(product.id)}
                            disabled={deleting === product.id}
                            className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                            title="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
