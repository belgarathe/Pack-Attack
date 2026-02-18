import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { 
  Database, 
  ArrowLeft, 
  Package,
} from 'lucide-react';
import { StockImportClient } from './StockImportClient';

export default async function ShopStockPage() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { shop: true },
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SHOP_OWNER')) {
    redirect('/dashboard');
  }

  const shop = user.shop;
  const isAdmin = user.role === 'ADMIN';

  const productCount = shop ? await prisma.shopProduct.count({
    where: { shopId: shop.id, isActive: true },
  }) : 0;

  const totalStock = shop ? await prisma.shopProduct.aggregate({
    where: { shopId: shop.id, isActive: true },
    _sum: { stock: true },
  }) : null;

  return (
    <div className="min-h-screen font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />
      
      {/* Decorative gradient orbs */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl animate-float" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />

      <div className="relative container py-8 md:py-12">
        {/* Header */}
        <div className="mb-10">
          <Link 
            href="/shop-dashboard" 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full glass text-sm">
            <Database className="w-4 h-4 text-teal-400" />
            <span className="text-gray-300">{isAdmin ? 'Admin View' : shop?.name || 'My Stock'}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 font-heading">
            <span className="text-white">My </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400">Stock</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Import and manage your card inventory. Add items via text list or CSV/Excel file.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-8 max-w-lg">
          <div className="glass-strong rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-500/10">
                <Package className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{productCount}</p>
                <p className="text-xs text-gray-400">Products</p>
              </div>
            </div>
          </div>
          <div className="glass-strong rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Database className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalStock?._sum?.stock || 0}</p>
                <p className="text-xs text-gray-400">Total Stock</p>
              </div>
            </div>
          </div>
        </div>

        {/* Import Section */}
        <StockImportClient />
      </div>
    </div>
  );
}
