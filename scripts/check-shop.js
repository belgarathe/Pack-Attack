const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  console.log('=== SHOPS ===');
  const shops = await p.shop.findMany();
  shops.forEach(s => {
    console.log(`Shop: ${s.name}, ID: ${s.id}, Active: ${s.isActive}`);
  });
  
  console.log('\n=== PRODUCTS ===');
  const products = await p.shopProduct.findMany({ include: { shop: true } });
  products.forEach(prod => {
    console.log(`Product: ${prod.name}`);
    console.log(`  - ID: ${prod.id}`);
    console.log(`  - Stock: ${prod.stock}`);
    console.log(`  - Active: ${prod.isActive}`);
    console.log(`  - Shop: ${prod.shop.name} (active: ${prod.shop.isActive})`);
  });
  
  console.log('\n=== FILTER CHECK ===');
  const filtered = await p.shopProduct.findMany({
    where: {
      isActive: true,
      stock: { gt: 0 },
      shop: { isActive: true },
    },
  });
  console.log(`Products matching shop page filters: ${filtered.length}`);
  
  await p.$disconnect();
}

check().catch(console.error);
