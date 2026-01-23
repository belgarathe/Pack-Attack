import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Package, Plus, Store, ArrowLeft, Edit, Eye, EyeOff, Trash2 } from 'lucide-react';
import { ShopBoxesClient } from './ShopBoxesClient';

export default async function ShopBoxesPage() {
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

  const isAdmin = user.role === 'ADMIN';
  const shop = user.shop;

  // Fetch boxes based on role
  let boxes: any[];
  if (isAdmin) {
    boxes = await prisma.box.findMany({
      where: { createdByShopId: { not: null } },
      include: {
        cards: { select: { id: true, name: true, coinValue: true } },
        createdByShop: { select: { id: true, name: true } },
        _count: { select: { pulls: true, shopBoxOrders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  } else if (shop) {
    boxes = await prisma.box.findMany({
      where: { createdByShopId: shop.id },
      include: {
        cards: { select: { id: true, name: true, coinValue: true } },
        _count: { select: { pulls: true, shopBoxOrders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  } else {
    boxes = [];
  }

  // Convert Decimal fields to numbers for JSON serialization
  const serializedBoxes = boxes.map((box: any) => ({
    ...box,
    price: Number(box.price),
    cards: box.cards.map((card: any) => ({
      ...card,
      coinValue: Number(card.coinValue),
    })),
  }));

  return (
    <div className="min-h-screen font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />
      <div className="fixed top-40 left-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-float" />

      <div className="relative container py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/shop-dashboard" 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-sm mb-3">
                <Store className="w-4 h-4 text-cyan-400" />
                <span className="text-gray-300">{isAdmin ? 'Admin View' : shop?.name || 'Shop Dashboard'}</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold mb-2 font-heading">
                <span className="text-white">My </span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Boxes</span>
              </h1>
              <p className="text-gray-400">Manage your created card boxes and their settings.</p>
            </div>
            
            <Link
              href="/shop-dashboard/boxes/create"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium transition-all shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Box</span>
            </Link>
          </div>
        </div>

        {/* Boxes Grid */}
        <ShopBoxesClient boxes={serializedBoxes} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
