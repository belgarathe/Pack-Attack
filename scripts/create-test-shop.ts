/**
 * Script to create a test shop account with comprehensive test data
 * Run with: npx tsx scripts/create-test-shop.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Card stock data - realistic card names for different games
const CARD_STOCK = {
  POKEMON: [
    { name: 'Charizard VMAX', rarity: 'Secret Rare', value: 250 },
    { name: 'Pikachu VMAX', rarity: 'Ultra Rare', value: 85 },
    { name: 'Mewtwo V', rarity: 'Ultra Rare', value: 45 },
    { name: 'Umbreon VMAX', rarity: 'Secret Rare', value: 180 },
    { name: 'Rayquaza VMAX', rarity: 'Ultra Rare', value: 120 },
    { name: 'Gengar VMAX', rarity: 'Ultra Rare', value: 65 },
    { name: 'Mew V', rarity: 'Ultra Rare', value: 55 },
    { name: 'Blaziken VMAX', rarity: 'Rare', value: 35 },
    { name: 'Sylveon VMAX', rarity: 'Ultra Rare', value: 75 },
    { name: 'Eevee V', rarity: 'Rare', value: 25 },
    { name: 'Arceus V', rarity: 'Ultra Rare', value: 40 },
    { name: 'Dialga V', rarity: 'Rare', value: 30 },
    { name: 'Palkia V', rarity: 'Rare', value: 28 },
    { name: 'Giratina V', rarity: 'Ultra Rare', value: 95 },
    { name: 'Lugia V', rarity: 'Ultra Rare', value: 110 },
  ],
  MAGIC_THE_GATHERING: [
    { name: 'Black Lotus', rarity: 'Mythic', value: 500 },
    { name: 'Force of Will', rarity: 'Rare', value: 120 },
    { name: 'Liliana of the Veil', rarity: 'Mythic', value: 85 },
    { name: 'Jace, the Mind Sculptor', rarity: 'Mythic', value: 95 },
    { name: 'Tarmogoyf', rarity: 'Mythic', value: 45 },
    { name: 'Snapcaster Mage', rarity: 'Rare', value: 35 },
    { name: 'Thoughtseize', rarity: 'Rare', value: 25 },
    { name: 'Scalding Tarn', rarity: 'Rare', value: 55 },
    { name: 'Misty Rainforest', rarity: 'Rare', value: 50 },
    { name: 'Verdant Catacombs', rarity: 'Rare', value: 48 },
    { name: 'Wrenn and Six', rarity: 'Mythic', value: 75 },
    { name: 'Ragavan, Nimble Pilferer', rarity: 'Mythic', value: 65 },
    { name: 'The One Ring', rarity: 'Mythic', value: 150 },
    { name: 'Orcish Bowmasters', rarity: 'Rare', value: 40 },
    { name: 'Sheoldred, the Apocalypse', rarity: 'Mythic', value: 80 },
  ],
  YUGIOH: [
    { name: 'Blue-Eyes White Dragon', rarity: 'Secret Rare', value: 200 },
    { name: 'Dark Magician', rarity: 'Ultra Rare', value: 75 },
    { name: 'Exodia the Forbidden One', rarity: 'Secret Rare', value: 150 },
    { name: 'Red-Eyes Black Dragon', rarity: 'Ultra Rare', value: 60 },
    { name: 'Stardust Dragon', rarity: 'Ultra Rare', value: 45 },
    { name: 'Ash Blossom & Joyous Spring', rarity: 'Secret Rare', value: 85 },
    { name: 'Nibiru, the Primal Being', rarity: 'Ultra Rare', value: 35 },
    { name: 'Accesscode Talker', rarity: 'Ultra Rare', value: 55 },
    { name: 'Zeus, Sky Thunder', rarity: 'Secret Rare', value: 70 },
    { name: 'Baronne de Fleur', rarity: 'Ultra Rare', value: 40 },
  ],
  ONE_PIECE: [
    { name: 'Monkey D. Luffy (Leader)', rarity: 'Super Rare', value: 120 },
    { name: 'Roronoa Zoro', rarity: 'Super Rare', value: 85 },
    { name: 'Nami', rarity: 'Rare', value: 35 },
    { name: 'Shanks', rarity: 'Secret Rare', value: 180 },
    { name: 'Portgas D. Ace', rarity: 'Super Rare', value: 95 },
    { name: 'Boa Hancock', rarity: 'Super Rare', value: 75 },
    { name: 'Trafalgar Law', rarity: 'Super Rare', value: 65 },
    { name: 'Kaido', rarity: 'Secret Rare', value: 150 },
  ],
  LORCANA: [
    { name: 'Elsa - Spirit of Winter', rarity: 'Enchanted', value: 200 },
    { name: 'Mickey Mouse - True Friend', rarity: 'Legendary', value: 85 },
    { name: 'Stitch - Carefree Surfer', rarity: 'Super Rare', value: 55 },
    { name: 'Maleficent - Monstrous Dragon', rarity: 'Legendary', value: 120 },
    { name: 'Robin Hood - Champion', rarity: 'Super Rare', value: 45 },
    { name: 'Cinderella - Ballroom Sensation', rarity: 'Enchanted', value: 175 },
    { name: 'Simba - Returned King', rarity: 'Legendary', value: 95 },
  ],
};

// Customer names for realistic orders
const CUSTOMER_NAMES = [
  'Max Mustermann', 'Anna Schmidt', 'Thomas Müller', 'Sarah Weber', 'Michael Fischer',
  'Laura Schneider', 'Daniel Becker', 'Julia Wagner', 'Christian Hoffmann', 'Lisa Klein',
  'Markus Zimmermann', 'Nicole Braun', 'Stefan Krüger', 'Jennifer Wolf', 'Patrick Meyer',
  'Sabrina Schulz', 'Alexander Neumann', 'Melanie Schwarz', 'Tobias Hartmann', 'Sandra Lange',
  'Florian König', 'Katharina Huber', 'Dennis Fuchs', 'Christina Kaiser', 'Marcel Peters',
];

const CITIES = [
  { city: 'Berlin', zip: '10115' },
  { city: 'Munich', zip: '80331' },
  { city: 'Hamburg', zip: '20095' },
  { city: 'Frankfurt', zip: '60311' },
  { city: 'Cologne', zip: '50667' },
  { city: 'Stuttgart', zip: '70173' },
  { city: 'Düsseldorf', zip: '40213' },
  { city: 'Leipzig', zip: '04109' },
  { city: 'Dresden', zip: '01067' },
  { city: 'Nuremberg', zip: '90402' },
];

const STATUSES: ('PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED')[] = [
  'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack: number): Date {
  const now = new Date();
  const pastDate = new Date(now.getTime() - Math.random() * daysBack * 24 * 60 * 60 * 1000);
  return pastDate;
}

async function main() {
  console.log('🚀 Creating test shop account and data...\n');

  // 1. Create test shop owner
  console.log('👤 Creating test shop owner...');
  const passwordHash = await bcrypt.hash('TestShop123!', 12);
  
  const shopOwner = await prisma.user.upsert({
    where: { email: 'testshop@pack-attack.de' },
    update: {
      name: 'Test Shop Owner',
      role: 'SHOP_OWNER',
      emailVerified: true,
      coins: 50000,
    },
    create: {
      email: 'testshop@pack-attack.de',
      name: 'Test Shop Owner',
      passwordHash,
      role: 'SHOP_OWNER',
      emailVerified: true,
      coins: 50000,
    },
  });
  console.log(`   ✅ Shop owner: ${shopOwner.email}`);

  // 2. Create shop
  console.log('🏪 Creating shop...');
  const shop = await prisma.shop.upsert({
    where: { ownerId: shopOwner.id },
    update: {
      name: 'CardMaster Pro Shop',
      description: 'Premium trading cards from all major TCGs. Quality guaranteed!',
      isActive: true,
    },
    create: {
      ownerId: shopOwner.id,
      name: 'CardMaster Pro Shop',
      description: 'Premium trading cards from all major TCGs. Quality guaranteed!',
      isActive: true,
    },
  });
  console.log(`   ✅ Shop created: ${shop.name}`);

  // 3. Create boxes with cards
  console.log('📦 Creating boxes with cards...');
  
  const boxConfigs = [
    {
      name: 'Pokemon Premium Collection',
      description: 'Premium Pokemon cards featuring rare VMAX and V cards!',
      price: 25,
      cardsPerPack: 5,
      games: ['POKEMON'] as const,
      cards: CARD_STOCK.POKEMON,
    },
    {
      name: 'MTG Masters Box',
      description: 'High-value Magic: The Gathering cards from various sets.',
      price: 35,
      cardsPerPack: 5,
      games: ['MAGIC_THE_GATHERING'] as const,
      cards: CARD_STOCK.MAGIC_THE_GATHERING,
    },
    {
      name: 'Yu-Gi-Oh Legends',
      description: 'Legendary Yu-Gi-Oh! cards including iconic monsters.',
      price: 20,
      cardsPerPack: 5,
      games: ['YUGIOH'] as const,
      cards: CARD_STOCK.YUGIOH,
    },
    {
      name: 'One Piece Treasure',
      description: 'Rare One Piece TCG cards featuring beloved characters.',
      price: 30,
      cardsPerPack: 5,
      games: ['ONE_PIECE'] as const,
      cards: CARD_STOCK.ONE_PIECE,
    },
    {
      name: 'Lorcana Dreams',
      description: 'Enchanted Lorcana cards from the magical Disney universe.',
      price: 28,
      cardsPerPack: 5,
      games: ['LORCANA'] as const,
      cards: CARD_STOCK.LORCANA,
    },
  ];

  const boxes = [];
  for (const config of boxConfigs) {
    // Delete existing box if present
    await prisma.box.deleteMany({
      where: { name: config.name, createdByShopId: shop.id },
    });

    const box = await prisma.box.create({
      data: {
        name: config.name,
        description: config.description,
        imageUrl: 'https://placehold.co/400x300/1a1a2e/ffffff?text=' + encodeURIComponent(config.name),
        price: config.price,
        cardsPerPack: config.cardsPerPack,
        games: config.games as any,
        isActive: true,
        createdByShopId: shop.id,
        cards: {
          create: config.cards.map((card, idx) => ({
            scryfallId: `test-${config.games[0].toLowerCase()}-${idx}`,
            name: card.name,
            setName: config.name,
            setCode: config.games[0].substring(0, 3).toUpperCase(),
            collectorNumber: String(idx + 1),
            rarity: card.rarity,
            imageUrlGatherer: `https://placehold.co/300x420/2d2d44/ffffff?text=${encodeURIComponent(card.name)}`,
            colors: [],
            type: 'Card',
            pullRate: 100 / config.cards.length,
            coinValue: card.value,
            sourceGame: config.games[0] as any,
          })),
        },
      },
    });
    boxes.push(box);
    console.log(`   ✅ Box: ${box.name} (${config.cards.length} cards)`);
  }

  // 4. Create test customers
  console.log('👥 Creating test customers...');
  const customers = [];
  for (let i = 0; i < 50; i++) {
    const customer = await prisma.user.upsert({
      where: { email: `testcustomer${i + 1}@example.com` },
      update: {},
      create: {
        email: `testcustomer${i + 1}@example.com`,
        name: CUSTOMER_NAMES[i % CUSTOMER_NAMES.length],
        passwordHash,
        role: 'USER',
        emailVerified: true,
        coins: Math.floor(Math.random() * 10000),
      },
    });
    customers.push(customer);
  }
  console.log(`   ✅ Created ${customers.length} test customers`);

  // 5. Create orders (20,000 orders spread across statuses)
  console.log('📋 Creating 20,000 orders...');
  
  // Distribution: 5% Pending, 5% Confirmed, 10% Processing, 30% Shipped, 50% Delivered
  const statusDistribution = {
    PENDING: 1000,      // 5%
    CONFIRMED: 1000,    // 5%
    PROCESSING: 2000,   // 10%
    SHIPPED: 6000,      // 30%
    DELIVERED: 10000,   // 50%
  };

  let totalOrders = 0;
  let totalRevenue = 0;

  // Batch create for performance
  const batchSize = 500;
  
  for (const [status, count] of Object.entries(statusDistribution)) {
    console.log(`   📦 Creating ${count} ${status} orders...`);
    
    for (let batch = 0; batch < count; batch += batchSize) {
      const ordersToCreate = Math.min(batchSize, count - batch);
      const orders = [];

      for (let i = 0; i < ordersToCreate; i++) {
        const box = randomElement(boxes);
        const customer = randomElement(customers);
        const city = randomElement(CITIES);
        const customerName = randomElement(CUSTOMER_NAMES);
        
        // Get all cards for this box to pick from
        const boxCards = await prisma.card.findMany({ where: { boxId: box.id } });
        const card = randomElement(boxCards);
        
        const cardValue = Number(card.coinValue);
        totalRevenue += cardValue;
        
        orders.push({
          shopId: shop.id,
          boxId: box.id,
          userId: customer.id,
          status: status as any,
          cardName: card.name,
          cardImage: card.imageUrlGatherer,
          cardValue: cardValue,
          cardRarity: card.rarity,
          shippingName: customerName,
          shippingEmail: customer.email,
          shippingAddress: `Teststraße ${Math.floor(Math.random() * 200) + 1}`,
          shippingCity: city.city,
          shippingZip: city.zip,
          shippingCountry: 'Germany',
          shippingCost: 5.00,
          trackingNumber: status === 'SHIPPED' || status === 'DELIVERED' 
            ? `DE${Math.random().toString(36).substring(2, 14).toUpperCase()}`
            : null,
          createdAt: randomDate(status === 'DELIVERED' ? 180 : status === 'SHIPPED' ? 30 : 14),
        });
      }

      await prisma.shopBoxOrder.createMany({ data: orders });
      totalOrders += ordersToCreate;
      
      if ((batch + batchSize) % 2000 === 0 || batch + batchSize >= count) {
        process.stdout.write(`      Progress: ${Math.min(batch + batchSize, count)}/${count}\r`);
      }
    }
    console.log(`   ✅ ${status}: ${count} orders created`);
  }

  // 6. Summary
  console.log('\n' + '='.repeat(50));
  console.log('✨ TEST SHOP SETUP COMPLETE!\n');
  console.log('📊 Summary:');
  console.log(`   • Shop Owner Email: testshop@pack-attack.de`);
  console.log(`   • Shop Owner Password: TestShop123!`);
  console.log(`   • Shop Name: ${shop.name}`);
  console.log(`   • Boxes Created: ${boxes.length}`);
  console.log(`   • Total Cards: ${boxes.length * 10} (approx)`);
  console.log(`   • Total Orders: ${totalOrders.toLocaleString()}`);
  console.log(`   • Total Revenue: ${totalRevenue.toLocaleString()} coins`);
  console.log('\n📈 Order Distribution:');
  console.log(`   • Pending: ${statusDistribution.PENDING.toLocaleString()}`);
  console.log(`   • Confirmed: ${statusDistribution.CONFIRMED.toLocaleString()}`);
  console.log(`   • Processing: ${statusDistribution.PROCESSING.toLocaleString()}`);
  console.log(`   • Shipped: ${statusDistribution.SHIPPED.toLocaleString()}`);
  console.log(`   • Delivered: ${statusDistribution.DELIVERED.toLocaleString()}`);
  console.log('\n🔑 Login at: https://pack-attack.de/login');
  console.log('   Then go to: https://pack-attack.de/shop-dashboard');
  console.log('='.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
