/**
 * Script to promote a user to SHOP_OWNER role
 * Usage: npx ts-node --esm scripts/create-shop-owner.ts <email> [shopName]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const shopName = process.argv[3];

  if (!email) {
    console.error('Usage: npx ts-node --esm scripts/create-shop-owner.ts <email> [shopName]');
    console.error('Example: npx ts-node --esm scripts/create-shop-owner.ts user@example.com "My Awesome Shop"');
    process.exit(1);
  }

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email },
    include: { shop: true },
  });

  if (!user) {
    console.error(`User with email "${email}" not found`);
    process.exit(1);
  }

  // Update user role to SHOP_OWNER
  const updatedUser = await prisma.user.update({
    where: { email },
    data: { role: 'SHOP_OWNER' },
  });

  console.log(`✅ User "${email}" role updated to SHOP_OWNER`);

  // Create shop if doesn't exist
  if (!user.shop) {
    const shop = await prisma.shop.create({
      data: {
        ownerId: user.id,
        name: shopName || (user.name ? `${user.name}'s Shop` : 'My Shop'),
        description: 'Welcome to my card shop!',
      },
    });
    console.log(`✅ Shop created: "${shop.name}" (ID: ${shop.id})`);
  } else {
    console.log(`ℹ️ User already has a shop: "${user.shop.name}"`);
    
    if (shopName && shopName !== user.shop.name) {
      await prisma.shop.update({
        where: { id: user.shop.id },
        data: { name: shopName },
      });
      console.log(`✅ Shop name updated to: "${shopName}"`);
    }
  }

  console.log('\n🎉 Done! The user can now access the Shop Dashboard.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
