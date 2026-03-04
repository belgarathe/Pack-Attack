import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  Store, ArrowLeft, ShieldCheck, ShoppingCart,
  Package, Database, Coins, Clock, Eye, ClipboardList
} from 'lucide-react';
import { ShopDetailClient } from './ShopDetailClient';

export default async function AdminShopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const shop = await prisma.shop.findUnique({
    where: { id },
    include: {
      owner: {
        select: { id: true, email: true, name: true, createdAt: true },
      },
      products: {
        orderBy: { createdAt: 'desc' },
      },
      boxes: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          price: true,
          isActive: true,
          createdAt: true,
          _count: { select: { cards: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!shop) {
    redirect('/admin/shops');
  }

  const orders = await prisma.shopBoxOrder.findMany({
    where: { shopId: id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      box: { select: { id: true, name: true, imageUrl: true } },
      shop: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const [pendingOrders, totalStock, revenue, assignedOrderCount, assignedPendingCount] = await Promise.all([
    prisma.shopBoxOrder.count({
      where: { shopId: id, status: { in: ['PENDING', 'CONFIRMED', 'PROCESSING'] } },
    }),
    prisma.shopProduct.aggregate({
      where: { shopId: id },
      _sum: { stock: true },
    }),
    prisma.shopBoxOrder.aggregate({
      where: { shopId: id },
      _sum: { cardValue: true },
    }),
    prisma.order.count({ where: { assignedShopId: id } }),
    prisma.order.count({ where: { assignedShopId: id, status: 'PENDING' } }),
  ]);

  const serializedOrders = orders.map((order) => ({
    ...order,
    cardValue: Number(order.cardValue),
    shippingCost: Number(order.shippingCost),
  }));

  const serializedProducts = shop.products.map((p) => ({
    ...p,
    price: Number(p.price),
    comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
  }));

  const stats = {
    totalOrders: orders.length,
    pendingOrders,
    totalRevenue: Number(revenue._sum.cardValue || 0),
    productCount: shop.products.length,
    totalStock: totalStock._sum.stock || 0,
    boxCount: shop.boxes.length,
  };

  return (
    <div className="min-h-screen font-display">
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />

      <div className="relative container py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/shops"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shops
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-sm mb-3">
            <ShieldCheck className="w-4 h-4 text-orange-400" />
            <span className="text-gray-300">Admin View</span>
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center">
                <Store className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white font-heading">{shop.name}</h1>
                <p className="text-gray-400 text-sm">
                  Owner: {shop.owner.name || 'Unnamed'} ({shop.owner.email})
                  <span className={`ml-3 px-2 py-0.5 rounded-lg text-xs font-medium ${
                    shop.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {shop.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
            </div>
            <Link
              href={`/shop-dashboard?shopId=${shop.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25"
            >
              <Eye className="w-4 h-4" />
              View as Shop Owner
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <div className="glass rounded-xl p-4 text-center">
            <ShoppingCart className="w-5 h-5 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.totalOrders.toLocaleString()}</div>
            <div className="text-xs text-gray-400">Total Orders</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Clock className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.pendingOrders}</div>
            <div className="text-xs text-yellow-400">Pending</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Coins className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-xs text-gray-400">Revenue</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Package className="w-5 h-5 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.productCount}</div>
            <div className="text-xs text-gray-400">Products</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Database className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.totalStock.toLocaleString()}</div>
            <div className="text-xs text-gray-400">Stock Units</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Package className="w-5 h-5 text-orange-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.boxCount}</div>
            <div className="text-xs text-gray-400">Boxes</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <ClipboardList className="w-5 h-5 text-pink-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{assignedOrderCount}</div>
            <div className="text-xs text-gray-400">Assigned Orders ({assignedPendingCount} pending)</div>
          </div>
        </div>

        <ShopDetailClient
          shop={{
            id: shop.id,
            name: shop.name,
            description: shop.description,
            logo: shop.logo,
            banner: shop.banner,
            taxId: shop.taxId,
            isActive: shop.isActive,
            createdAt: shop.createdAt.toISOString(),
            updatedAt: shop.updatedAt.toISOString(),
            owner: { ...shop.owner, createdAt: shop.owner.createdAt.toISOString() },
          }}
          products={serializedProducts.map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() }))}
          orders={serializedOrders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString() }))}
          boxes={shop.boxes.map((b) => ({ ...b, price: Number(b.price), createdAt: b.createdAt.toISOString(), cardCount: b._count.cards }))}
        />
      </div>
    </div>
  );
}
