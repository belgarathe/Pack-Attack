import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { OrdersClient } from './OrdersClient';

async function getOrders() {
  const orders = await prisma.order.findMany({
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

  // Serialize dates to strings and convert Decimals to numbers
  return orders.map(order => ({
    ...order,
    totalCoins: Number(order.totalCoins),
    shippingCost: Number(order.shippingCost),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map(item => ({
      ...item,
      coinValue: Number(item.coinValue),
      createdAt: item.createdAt.toISOString(),
    })),
  }));
}

export default async function AdminOrdersPage() {
  const session = await getCurrentSession();
  
  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || user.role !== 'ADMIN') {
    redirect('/');
  }

  const orders = await getOrders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Order Management</h1>
        <p className="text-gray-400 mt-1">View and manage all customer orders</p>
      </div>

      <OrdersClient orders={orders} />
    </div>
  );
}

