import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ShoppingCart, Store, ArrowLeft, Package, Clock, Truck, CheckCircle } from 'lucide-react';
import { ShopOrdersClient } from './ShopOrdersClient';

export default async function ShopOrdersPage() {
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

  // Fetch orders based on role
  let orders;
  let stats;
  
  if (isAdmin) {
    // Admin sees all shop box orders
    orders = await prisma.shopBoxOrder.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
        box: { select: { id: true, name: true, imageUrl: true } },
        shop: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'PENDING').length,
      confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
      processing: orders.filter(o => o.status === 'PROCESSING').length,
      shipped: orders.filter(o => o.status === 'SHIPPED').length,
      delivered: orders.filter(o => o.status === 'DELIVERED').length,
    };
  } else if (shop) {
    orders = await prisma.shopBoxOrder.findMany({
      where: { shopId: shop.id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        box: { select: { id: true, name: true, imageUrl: true } },
        shop: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'PENDING').length,
      confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
      processing: orders.filter(o => o.status === 'PROCESSING').length,
      shipped: orders.filter(o => o.status === 'SHIPPED').length,
      delivered: orders.filter(o => o.status === 'DELIVERED').length,
    };
  } else {
    orders = [];
    stats = { total: 0, pending: 0, confirmed: 0, processing: 0, shipped: 0, delivered: 0 };
  }

  // Convert Decimal fields for JSON serialization
  const serializedOrders = orders.map(order => ({
    ...order,
    cardValue: Number(order.cardValue),
    shippingCost: Number(order.shippingCost),
  }));

  return (
    <div className="min-h-screen font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />
      <div className="fixed bottom-20 left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-float" />

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
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-sm mb-3">
            <Store className="w-4 h-4 text-emerald-400" />
            <span className="text-gray-300">{isAdmin ? 'Admin View' : shop?.name || 'Shop Dashboard'}</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-2 font-heading">
            <span className="text-white">Order </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Management</span>
          </h1>
          <p className="text-gray-400">View and process orders from your card boxes.</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="glass rounded-xl p-4 text-center">
            <ShoppingCart className="w-5 h-5 text-gray-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Clock className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.pending}</div>
            <div className="text-xs text-yellow-400">Pending</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <CheckCircle className="w-5 h-5 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.confirmed}</div>
            <div className="text-xs text-blue-400">Confirmed</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Package className="w-5 h-5 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.processing}</div>
            <div className="text-xs text-purple-400">Processing</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Truck className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.shipped}</div>
            <div className="text-xs text-indigo-400">Shipped</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.delivered}</div>
            <div className="text-xs text-green-400">Delivered</div>
          </div>
        </div>

        {/* Orders List */}
        <ShopOrdersClient orders={serializedOrders} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
