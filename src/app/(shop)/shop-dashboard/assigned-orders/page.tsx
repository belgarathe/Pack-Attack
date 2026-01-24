import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AssignedOrdersClient } from './AssignedOrdersClient';

async function getAssignedOrders(shopId: string) {
  const orders = await prisma.order.findMany({
    where: { assignedShopId: shopId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      items: true,
    },
  });

  return orders.map(order => ({
    ...order,
    totalCoins: Number(order.totalCoins),
    shippingCost: Number(order.shippingCost),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    assignedAt: order.assignedAt?.toISOString() || null,
    items: order.items.map(item => ({
      ...item,
      coinValue: Number(item.coinValue),
      createdAt: item.createdAt.toISOString(),
    })),
  }));
}

export default async function AssignedOrdersPage() {
  const session = await getCurrentSession();
  
  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { shop: true },
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SHOP_OWNER')) {
    redirect('/');
  }

  if (!user.shop) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Assigned Orders</h1>
          <p className="text-gray-400 mt-1">No shop associated with your account</p>
        </div>
        <div className="glass-strong rounded-2xl p-12 text-center">
          <p className="text-gray-400">Please contact an administrator to set up your shop.</p>
        </div>
      </div>
    );
  }

  const orders = await getAssignedOrders(user.shop.id);

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    processing: orders.filter(o => o.status === 'PROCESSING').length,
    shipped: orders.filter(o => o.status === 'SHIPPED').length,
    delivered: orders.filter(o => o.status === 'DELIVERED').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Assigned Orders</h1>
        <p className="text-gray-400 mt-1">
          Orders assigned to <span className="text-purple-400 font-medium">{user.shop.name}</span> for fulfillment
        </p>
      </div>

      <AssignedOrdersClient orders={orders} stats={stats} />
    </div>
  );
}
