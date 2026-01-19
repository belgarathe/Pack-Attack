import { prisma } from '@/lib/prisma';
import { ShopClient } from './ShopClient';

async function getProducts() {
  const products = await prisma.shopProduct.findMany({
    where: {
      isActive: true,
      stock: { gt: 0 },
      shop: { isActive: true },
    },
    include: {
      shop: {
        select: {
          id: true,
          name: true,
          logo: true,
        },
      },
    },
    orderBy: [
      { featured: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return products.map(product => ({
    ...product,
    price: Number(product.price),
    comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  }));
}

async function getCategories() {
  const categories = await prisma.shopProduct.groupBy({
    by: ['category'],
    where: {
      isActive: true,
      stock: { gt: 0 },
      shop: { isActive: true },
    },
    _count: true,
  });
  return categories;
}

async function getGames() {
  const games = await prisma.shopProduct.groupBy({
    by: ['game'],
    where: {
      isActive: true,
      stock: { gt: 0 },
      shop: { isActive: true },
      game: { not: null },
    },
    _count: true,
  });
  return games;
}

export default async function ShopPage() {
  const [products, categories, games] = await Promise.all([
    getProducts(),
    getCategories(),
    getGames(),
  ]);

  return (
    <ShopClient 
      initialProducts={products} 
      categories={categories}
      games={games}
    />
  );
}
