/**
 * Script to remove ALL test data from production database
 * - Removes test shop owner (testshop@pack-attack.de)
 * - Removes test shop (CardMaster Pro Shop)
 * - Removes all boxes created by the test shop
 * - Removes all ShopBoxOrders for the test shop
 * - Removes all 50 test customers (testcustomer1-50@example.com)
 * - Removes any pulls/cards associated with test data
 * 
 * Run with: npx tsx scripts/cleanup-test-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting test data cleanup...\n');

  // 1. Find the test shop owner
  const shopOwner = await prisma.user.findUnique({
    where: { email: 'testshop@pack-attack.de' },
    include: { shop: true },
  });

  if (shopOwner?.shop) {
    const shopId = shopOwner.shop.id;
    console.log(`🏪 Found test shop: "${shopOwner.shop.name}" (${shopId})`);

    // 2. Delete all ShopBoxOrders for this shop
    const deletedOrders = await prisma.shopBoxOrder.deleteMany({
      where: { shopId },
    });
    console.log(`   ✅ Deleted ${deletedOrders.count} ShopBoxOrders`);

    // 3. Delete all ShopOrders for this shop
    const deletedShopOrders = await prisma.shopOrder.deleteMany({
      where: { shopId },
    });
    console.log(`   ✅ Deleted ${deletedShopOrders.count} ShopOrders`);

    // 4. Find and delete all boxes created by this shop (cards/pulls cascade)
    const shopBoxes = await prisma.box.findMany({
      where: { createdByShopId: shopId },
      select: { id: true, name: true },
    });

    for (const box of shopBoxes) {
      // Delete pulls for this box first (Pull doesn't cascade from Box automatically on user side)
      await prisma.pull.deleteMany({ where: { boxId: box.id } });
      // Delete cards (cascades from box, but explicit for safety)
      await prisma.card.deleteMany({ where: { boxId: box.id } });
      // Delete the box
      await prisma.box.delete({ where: { id: box.id } });
      console.log(`   ✅ Deleted box: "${box.name}" and its cards/pulls`);
    }

    // 5. Delete any ShopProducts
    const deletedProducts = await prisma.shopProduct.deleteMany({
      where: { shopId },
    });
    console.log(`   ✅ Deleted ${deletedProducts.count} ShopProducts`);

    // 6. Delete Orders assigned to this shop
    const unassigned = await prisma.order.updateMany({
      where: { assignedShopId: shopId },
      data: { assignedShopId: null },
    });
    console.log(`   ✅ Unassigned ${unassigned.count} Orders from test shop`);

    // 7. Delete the shop
    await prisma.shop.delete({ where: { id: shopId } });
    console.log(`   ✅ Deleted shop: "${shopOwner.shop.name}"`);
  } else {
    console.log('   ⚠️  No test shop found (may already be deleted)');
  }

  // 8. Delete test shop owner user
  if (shopOwner) {
    // Delete related data that doesn't cascade
    await prisma.pull.deleteMany({ where: { userId: shopOwner.id } });
    await prisma.saleHistory.deleteMany({ where: { userId: shopOwner.id } });
    await prisma.transaction.deleteMany({ where: { userId: shopOwner.id } });
    await prisma.user.delete({ where: { id: shopOwner.id } });
    console.log(`   ✅ Deleted test shop owner: ${shopOwner.email}`);
  }

  // 9. Delete all 50 test customers
  console.log('\n👥 Removing test customers...');
  let deletedCustomers = 0;

  for (let i = 1; i <= 50; i++) {
    const email = `testcustomer${i}@example.com`;
    const customer = await prisma.user.findUnique({ where: { email } });
    
    if (customer) {
      // Delete related data that doesn't cascade from user
      await prisma.shopBoxOrder.deleteMany({ where: { userId: customer.id } });
      await prisma.pull.deleteMany({ where: { userId: customer.id } });
      await prisma.saleHistory.deleteMany({ where: { userId: customer.id } });
      await prisma.transaction.deleteMany({ where: { userId: customer.id } });
      await prisma.battleParticipant.deleteMany({ where: { userId: customer.id } });
      await prisma.userAchievement.deleteMany({ where: { userId: customer.id } });
      
      // Delete orders and order items
      const userOrders = await prisma.order.findMany({ where: { userId: customer.id }, select: { id: true } });
      for (const order of userOrders) {
        await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
      }
      await prisma.order.deleteMany({ where: { userId: customer.id } });
      await prisma.shopOrder.deleteMany({ where: { userId: customer.id } });

      // Delete user (cascades to cart, shopCart, chatMessages, accounts, emailLogs)
      await prisma.user.delete({ where: { id: customer.id } });
      deletedCustomers++;
    }
  }
  console.log(`   ✅ Deleted ${deletedCustomers} test customers`);

  // 10. Summary
  console.log('\n' + '='.repeat(50));
  console.log('✨ TEST DATA CLEANUP COMPLETE!');
  console.log('='.repeat(50));
  console.log('All test shops, boxes, orders, and users have been removed.');
}

main()
  .catch((e) => {
    console.error('❌ Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
