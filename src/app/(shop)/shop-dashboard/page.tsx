import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  Truck,
  Store,
  Plus,
  BarChart3,
  Sparkles
} from 'lucide-react';

export default async function ShopDashboard() {
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

  // Get the shop (for admins, we'll show aggregate data)
  const shop = user.shop;
  const isAdmin = user.role === 'ADMIN';

  // Get statistics based on role
  let stats: {
    totalBoxes: number;
    activeBoxes: number;
    totalOrders: number;
    pendingOrders: number;
    processingOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    totalRevenue: number;
    uniqueCustomers: number;
    recentOrders: any[];
  };
  if (isAdmin) {
    // Admin sees all shop-created boxes and orders
    const [
      totalShopBoxes,
      activeShopBoxes,
      totalBoxOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      totalRevenue,
      uniqueCustomers,
      recentOrders,
    ] = await Promise.all([
      prisma.box.count({ where: { createdByShopId: { not: null } } }),
      prisma.box.count({ where: { createdByShopId: { not: null }, isActive: true } }),
      prisma.shopBoxOrder.count(),
      prisma.shopBoxOrder.count({ where: { status: 'PENDING' } }),
      prisma.shopBoxOrder.count({ where: { status: 'PROCESSING' } }),
      prisma.shopBoxOrder.count({ where: { status: 'SHIPPED' } }),
      prisma.shopBoxOrder.count({ where: { status: 'DELIVERED' } }),
      prisma.shopBoxOrder.aggregate({ _sum: { cardValue: true } }),
      prisma.shopBoxOrder.groupBy({ by: ['userId'], _count: true }).then(r => r.length),
      prisma.shopBoxOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: true, box: true },
      }),
    ]);

    stats = {
      totalBoxes: totalShopBoxes,
      activeBoxes: activeShopBoxes,
      totalOrders: totalBoxOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      totalRevenue: Number(totalRevenue._sum.cardValue || 0),
      uniqueCustomers,
      recentOrders,
    };
  } else if (shop) {
    // Shop owner sees only their data
    const [
      totalShopBoxes,
      activeShopBoxes,
      totalBoxOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      totalRevenue,
      uniqueCustomers,
      recentOrders,
    ] = await Promise.all([
      prisma.box.count({ where: { createdByShopId: shop.id } }),
      prisma.box.count({ where: { createdByShopId: shop.id, isActive: true } }),
      prisma.shopBoxOrder.count({ where: { shopId: shop.id } }),
      prisma.shopBoxOrder.count({ where: { shopId: shop.id, status: 'PENDING' } }),
      prisma.shopBoxOrder.count({ where: { shopId: shop.id, status: 'PROCESSING' } }),
      prisma.shopBoxOrder.count({ where: { shopId: shop.id, status: 'SHIPPED' } }),
      prisma.shopBoxOrder.count({ where: { shopId: shop.id, status: 'DELIVERED' } }),
      prisma.shopBoxOrder.aggregate({ where: { shopId: shop.id }, _sum: { cardValue: true } }),
      prisma.shopBoxOrder.groupBy({ where: { shopId: shop.id }, by: ['userId'], _count: true }).then(r => r.length),
      prisma.shopBoxOrder.findMany({
        where: { shopId: shop.id },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: true, box: true },
      }),
    ]);

    stats = {
      totalBoxes: totalShopBoxes,
      activeBoxes: activeShopBoxes,
      totalOrders: totalBoxOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      totalRevenue: Number(totalRevenue._sum.cardValue || 0),
      uniqueCustomers,
      recentOrders,
    };
  } else {
    stats = {
      totalBoxes: 0,
      activeBoxes: 0,
      totalOrders: 0,
      pendingOrders: 0,
      processingOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      totalRevenue: 0,
      uniqueCustomers: 0,
      recentOrders: [],
    };
  }

  return (
    <div className="min-h-screen font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />
      
      {/* Decorative gradient orbs */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-float" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />

      <div className="relative container py-8 md:py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full glass text-sm">
            <Store className="w-4 h-4 text-emerald-400" />
            <span className="text-gray-300">{isAdmin ? 'Admin View' : shop?.name || 'Shop Dashboard'}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 font-heading">
            <span className="text-white">Shop </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400">Dashboard</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            {isAdmin 
              ? 'Manage all shop boxes and monitor orders across the platform.' 
              : 'Manage your boxes, track orders, and grow your card business.'}
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          <div className="glass rounded-2xl p-5 relative overflow-hidden group hover:ring-2 hover:ring-emerald-500/30 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
            <div className="relative">
              <Package className="w-6 h-6 text-emerald-400 mb-3" />
              <div className="text-3xl font-bold text-white mb-1">{stats.totalBoxes}</div>
              <div className="text-sm text-gray-400">Total Boxes</div>
            </div>
          </div>
          
          <div className="glass rounded-2xl p-5 relative overflow-hidden group hover:ring-2 hover:ring-teal-500/30 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent" />
            <div className="relative">
              <Sparkles className="w-6 h-6 text-teal-400 mb-3" />
              <div className="text-3xl font-bold text-white mb-1">{stats.activeBoxes}</div>
              <div className="text-sm text-gray-400">Active Boxes</div>
            </div>
          </div>
          
          <div className="glass rounded-2xl p-5 relative overflow-hidden group hover:ring-2 hover:ring-cyan-500/30 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent" />
            <div className="relative">
              <ShoppingCart className="w-6 h-6 text-cyan-400 mb-3" />
              <div className="text-3xl font-bold text-white mb-1">{stats.totalOrders}</div>
              <div className="text-sm text-gray-400">Total Orders</div>
            </div>
          </div>
          
          <div className="glass rounded-2xl p-5 relative overflow-hidden group hover:ring-2 hover:ring-amber-500/30 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
            <div className="relative">
              <DollarSign className="w-6 h-6 text-amber-400 mb-3" />
              <div className="text-3xl font-bold text-white mb-1">{stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="text-sm text-gray-400">Total Value (Coins)</div>
            </div>
          </div>
          
          <div className="glass rounded-2xl p-5 relative overflow-hidden group hover:ring-2 hover:ring-purple-500/30 transition-all col-span-2 md:col-span-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />
            <div className="relative">
              <Users className="w-6 h-6 text-purple-400 mb-3" />
              <div className="text-3xl font-bold text-white mb-1">{stats.uniqueCustomers}</div>
              <div className="text-sm text-gray-400">Unique Customers</div>
            </div>
          </div>
        </div>

        {/* Order Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="glass rounded-xl p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-yellow-500/10">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.pendingOrders}</div>
              <div className="text-xs text-yellow-400">Pending</div>
            </div>
          </div>
          
          <div className="glass rounded-xl p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.processingOrders}</div>
              <div className="text-xs text-blue-400">Processing</div>
            </div>
          </div>
          
          <div className="glass rounded-xl p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10">
              <Truck className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.shippedOrders}</div>
              <div className="text-xs text-purple-400">Shipped</div>
            </div>
          </div>
          
          <div className="glass rounded-xl p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/10">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.deliveredOrders}</div>
              <div className="text-xs text-green-400">Delivered</div>
            </div>
          </div>
        </div>

        {/* Main Action Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-10">
          {/* Orders Management */}
          <Link 
            href="/shop-dashboard/orders" 
            className="glass-strong rounded-2xl p-6 hover:ring-2 hover:ring-emerald-500/50 transition-all group relative overflow-hidden"
          >
            {stats.pendingOrders > 0 && (
              <div className="absolute -top-1 -right-1 w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg animate-pulse">
                {stats.pendingOrders}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="inline-flex items-center justify-center w-14 h-14 mb-5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 ring-1 ring-emerald-500/30">
                <ShoppingCart className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">Order Management</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                View and manage incoming orders. Process shipments and track deliveries.
              </p>
              <div className="mt-4 flex items-center text-emerald-400 text-sm font-medium">
                <span>Manage Orders</span>
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Create Box */}
          <Link 
            href="/shop-dashboard/boxes/create" 
            className="glass-strong rounded-2xl p-6 hover:ring-2 hover:ring-teal-500/50 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="inline-flex items-center justify-center w-14 h-14 mb-5 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 ring-1 ring-teal-500/30">
                <Plus className="w-7 h-7 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-teal-400 transition-colors">Create New Box</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Create custom card boxes with your inventory. Set pull rates and coin values.
              </p>
              <div className="mt-4 flex items-center text-teal-400 text-sm font-medium">
                <span>Create Box</span>
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* My Boxes */}
          <Link 
            href="/shop-dashboard/boxes" 
            className="glass-strong rounded-2xl p-6 hover:ring-2 hover:ring-cyan-500/50 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="inline-flex items-center justify-center w-14 h-14 mb-5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 ring-1 ring-cyan-500/30">
                <Package className="w-7 h-7 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">My Boxes</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                View and manage your created boxes. Edit cards, prices, and availability.
              </p>
              <div className="mt-4 flex items-center text-cyan-400 text-sm font-medium">
                <span>View Boxes</span>
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Orders Section */}
        <div className="glass-strong rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Recent Orders</h2>
            </div>
            <Link 
              href="/shop-dashboard/orders" 
              className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              View All →
            </Link>
          </div>
          
          {stats.recentOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No orders yet</p>
              <p className="text-gray-600 text-sm">When customers order cards from your boxes, they'll appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentOrders.map((order: any) => (
                <div 
                  key={order.id} 
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800/70 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-700 overflow-hidden flex-shrink-0">
                      {order.cardImage ? (
                        <img 
                          src={order.cardImage} 
                          alt={order.cardName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white truncate max-w-[200px]">{order.cardName}</p>
                      <p className="text-sm text-gray-400">
                        {order.user.name || order.user.email} • {order.box.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      order.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400' :
                      order.status === 'CONFIRMED' ? 'bg-blue-500/10 text-blue-400' :
                      order.status === 'PROCESSING' ? 'bg-purple-500/10 text-purple-400' :
                      order.status === 'SHIPPED' ? 'bg-indigo-500/10 text-indigo-400' :
                      order.status === 'DELIVERED' ? 'bg-green-500/10 text-green-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {order.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(order.createdAt).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
