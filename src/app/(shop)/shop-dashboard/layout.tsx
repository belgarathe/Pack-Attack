import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function ShopDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { shop: true },
  });

  // Allow ADMIN and SHOP_OWNER
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SHOP_OWNER')) {
    redirect('/dashboard');
  }

  // For SHOP_OWNER, ensure they have a shop
  if (user.role === 'SHOP_OWNER' && !user.shop) {
    // Create a shop for them if they don't have one
    await prisma.shop.create({
      data: {
        ownerId: user.id,
        name: user.name ? `${user.name}'s Shop` : 'My Shop',
        description: 'Welcome to my card shop!',
      },
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {children}
    </div>
  );
}
