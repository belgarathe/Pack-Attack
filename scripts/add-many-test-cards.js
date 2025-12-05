// Script to add MANY test cards to a box for testing animations with 10+ cards
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addManyTestCards() {
  try {
    // Find or create a test box
    let box = await prisma.box.findFirst({
      where: { name: 'Animation Test Box' }
    });
    
    if (!box) {
      // Create a new box specifically for testing animations
      box = await prisma.box.create({
        data: {
          name: 'Animation Test Box',
          description: 'Box with many cards to test animations',
          imageUrl: 'https://via.placeholder.com/300x420?text=Test+Box',
          price: 100,
          cardsPerPack: 5,
          isActive: true,
          featured: false,
          popularity: 0
        }
      });
      console.log(`Created new test box: ${box.name} (${box.id})`);
    } else {
      console.log(`Found existing test box: ${box.name} (${box.id})`);
      // Delete existing cards to start fresh
      await prisma.card.deleteMany({
        where: { boxId: box.id }
      });
      console.log('Cleared existing cards from test box');
    }
    
    // Create 15 test cards for this box
    const testCards = [];
    const cardImages = [
      'https://cards.scryfall.io/large/front/9/7/97a8a5fe-0391-489b-9556-0340fa7c012e.jpg?1650599624',
      'https://cards.scryfall.io/large/front/5/d/5d7585ab-a364-471c-8ef1-318e459b4020.jpg?1654568766',
      'https://cards.scryfall.io/large/front/8/c/8ca44265-5e1b-4fbf-9002-52b2ce9b7448.jpg?1674142103',
      'https://cards.scryfall.io/large/front/4/0/40d8f490-f04d-4d59-9ab0-a977527fd529.jpg?1665428373',
      'https://cards.scryfall.io/large/front/2/f/2f5f2bf8-0dc1-4b4a-b3d1-91c21bcb5d46.jpg?1674140825'
    ];
    
    for (let i = 1; i <= 15; i++) {
      testCards.push({
        scryfallId: `test-card-${i}-${Date.now()}`,
        name: `Test Card ${i}`,
        setName: 'Animation Test Set',
        setCode: 'TEST',
        collectorNumber: String(i),
        rarity: i <= 5 ? 'common' : i <= 10 ? 'uncommon' : 'rare',
        imageUrlGatherer: cardImages[i % cardImages.length] || `https://via.placeholder.com/300x420?text=Card+${i}`,
        colors: ['R', 'G', 'B'][i % 3],
        type: 'Creature',
        boxId: box.id,
        coinValue: Math.floor(Math.random() * 500) + 50,
        pullRate: parseFloat((100 / 15).toFixed(3)) // Equal distribution
      });
    }
    
    // Insert all test cards
    const result = await prisma.card.createMany({
      data: testCards
    });
    
    console.log(`Added ${result.count} test cards to the box!`);
    
    // Verify the box now has the cards
    const updatedBox = await prisma.box.findUnique({
      where: { id: box.id },
      include: { cards: true }
    });
    
    console.log(`\n✅ Success! Box "${updatedBox.name}" now has ${updatedBox.cards.length} cards!`);
    console.log(`\n📦 Test the animation at: http://localhost:3000/open/${box.id}`);
    
  } catch (error) {
    console.error('Error adding test cards:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addManyTestCards();
