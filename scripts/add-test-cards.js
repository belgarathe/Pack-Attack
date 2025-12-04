// Script to add more cards to a box for testing animations
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addTestCards() {
  try {
    // Find the first box (Test box)
    const box = await prisma.box.findFirst({
      where: { name: 'Test' }
    });
    
    if (!box) {
      console.log('Test box not found!');
      return;
    }
    
    console.log(`Found box: ${box.name} (${box.id})`);
    
    // Create 20 test cards for this box
    const testCards = [];
    for (let i = 1; i <= 20; i++) {
      testCards.push({
        name: `Test Card ${i}`,
        imageUrlGatherer: `https://via.placeholder.com/300x420?text=Card+${i}`,
        setName: 'Test Set',
        boxId: box.id,
        coinValue: Math.floor(Math.random() * 1000) + 100,
        pullRate: parseFloat((Math.random() * 5).toFixed(3))
      });
    }
    
    // Insert all test cards
    const result = await prisma.card.createMany({
      data: testCards,
      skipDuplicates: true
    });
    
    console.log(`Added ${result.count} test cards to the box!`);
    
    // Verify the box now has more cards
    const updatedBox = await prisma.box.findUnique({
      where: { id: box.id },
      include: { cards: true }
    });
    
    console.log(`Box now has ${updatedBox.cards.length} total cards!`);
    
  } catch (error) {
    console.error('Error adding test cards:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestCards();
